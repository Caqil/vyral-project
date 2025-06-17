import { FilterQuery } from 'mongoose';
import { BaseService } from './base';
import { CommentModel, CommentDocument } from '../models/comment';
import { PostModel } from '../models/post';
import { Comment } from '../types/content';
import { CommentStatusType } from '../types/core';
import { PaginationParams, PaginationResult } from '../types/api';
import { NotFoundError, ValidationError, ForbiddenError } from '../errors';
import { CACHE_KEYS, CACHE_TTL } from '../constants';
import { CacheManager } from '../utils/cache';

export class CommentService extends BaseService<CommentDocument> {
  private cache: CacheManager;

  constructor() {
    super(CommentModel, 'CommentService');
    this.cache = CacheManager.getInstance();
  }

  async createComment(data: Partial<Comment>): Promise<CommentDocument> {
    // Validate post exists
    if (data.postId) {
      const post = await PostModel.findById(data.postId);
      if (!post) {
        throw new NotFoundError('Post');
      }
      
      if (post.commentStatus === 'closed') {
        throw new ForbiddenError('Comments are closed for this post');
      }
    }

    // Validate parent comment exists if specified
    if (data.parentId) {
      const parentComment = await this.findById(data.parentId);
      if (!parentComment) {
        throw new NotFoundError('Parent comment');
      }
      
      // Ensure parent and child belong to same post
      if (parentComment.postId.toString() !== data.postId) {
        throw new ValidationError('Parent comment must belong to the same post');
      }
    }

    const comment = await this.create(data);
    
    // Clear comment caches for this post
    await this.cache.deleteByPattern(`comments:${data.postId}:*`);
    
    this.logger.info(`Created comment ${comment._id} for post ${data.postId}`);
    return comment;
  }

  async getCommentsByPost(
    postId: string,
    options: {
      status?: CommentStatusType | CommentStatusType[];
      includeReplies?: boolean;
      sort?: string;
      order?: 'asc' | 'desc';
    } = {},
    pagination?: PaginationParams
  ): Promise<PaginationResult<CommentDocument>> {
    const cacheKey = `comments:${postId}:${JSON.stringify(options)}:${JSON.stringify(pagination)}`;
    let result = await this.cache.get<PaginationResult<CommentDocument>>(cacheKey);

    if (!result) {
      const filter: FilterQuery<CommentDocument> = { postId };

      if (options.status) {
        if (Array.isArray(options.status)) {
          filter.status = { $in: options.status };
        } else {
          filter.status = options.status;
        }
      }

      // Only get top-level comments by default
      if (!options.includeReplies) {
        filter.parentId = { $exists: false };
      }

      const populateOptions = {
        populate: [
          { path: 'author.userId', select: 'displayName avatar' },
          { path: 'replies', populate: { path: 'author.userId', select: 'displayName avatar' } }
        ]
      };

      result = await this.findMany(filter, pagination, populateOptions);
      await this.cache.set(cacheKey, result, CACHE_TTL.SHORT);
    }

    return result;
  }

  async getCommentTree(postId: string, status: CommentStatusType = 'approved'): Promise<CommentDocument[]> {
    const cacheKey = `comments:tree:${postId}:${status}`;
    let comments = await this.cache.get<CommentDocument[]>(cacheKey);

    if (!comments) {
      // Get all comments for the post
      const allComments = await this.model
        .find({ postId, status })
        .populate('author.userId', 'displayName avatar')
        .sort({ createdAt: 1 })
        .lean();

      // Build comment tree
      comments = this.buildCommentTree(allComments);
      await this.cache.set(cacheKey, comments, CACHE_TTL.MEDIUM);
    }

    return comments;
  }

  private buildCommentTree(comments: any[]): any[] {
    const commentMap = new Map();
    const roots: any[] = [];

    // Create comment objects with children arrays
    comments.forEach(comment => {
      commentMap.set(comment._id.toString(), { ...comment, children: [] });
    });

    // Build the tree structure
    comments.forEach(comment => {
      const commentObj = commentMap.get(comment._id.toString());
      if (comment.parentId && commentMap.has(comment.parentId.toString())) {
        commentMap.get(comment.parentId.toString()).children.push(commentObj);
      } else {
        roots.push(commentObj);
      }
    });

    return roots;
  }

  async updateComment(id: string, data: Partial<Comment>): Promise<CommentDocument> {
    const comment = await this.findByIdOrThrow(id);
    const updated = await this.updateByIdOrThrow(id, data);
    
    // Clear comment caches for this post
    await this.cache.deleteByPattern(`comments:${comment.postId}:*`);
    await this.cache.deleteByPattern(`comments:tree:${comment.postId}:*`);
    
    this.logger.info(`Updated comment ${id}`);
    return updated;
  }

  async deleteComment(id: string): Promise<void> {
    const comment = await this.findByIdOrThrow(id);
    
    // Get all child comments before deletion
    const childComments = await this.findMany({ parentId: id });
    
    await this.deleteByIdOrThrow(id);
    
    // Clear comment caches for this post
    await this.cache.deleteByPattern(`comments:${comment.postId}:*`);
    await this.cache.deleteByPattern(`comments:tree:${comment.postId}:*`);
    
    this.logger.info(`Deleted comment ${id} and ${childComments.data.length} child comments`);
  }

  async approveComment(id: string): Promise<CommentDocument> {
    const comment = await this.updateComment(id, { status: 'approved' });
    this.logger.info(`Approved comment ${id}`);
    return comment;
  }

  async rejectComment(id: string): Promise<CommentDocument> {
    const comment = await this.updateComment(id, { status: 'spam' });
    this.logger.info(`Rejected comment ${id}`);
    return comment;
  }

  async markAsSpam(id: string): Promise<CommentDocument> {
    const comment = await this.updateComment(id, { status: 'spam' });
    this.logger.info(`Marked comment ${id} as spam`);
    return comment;
  }

  async moveToTrash(id: string): Promise<CommentDocument> {
    const comment = await this.updateComment(id, { status: 'trash' });
    this.logger.info(`Moved comment ${id} to trash`);
    return comment;
  }

  async bulkUpdateStatus(ids: string[], status: CommentStatusType): Promise<{ updated: number; errors: string[] }> {
    const result = { updated: 0, errors: [] as string[] };
    const postIds = new Set<string>();

    for (const id of ids) {
      try {
        const comment = await this.updateByIdOrThrow(id, { status });
        postIds.add(comment.postId.toString());
        result.updated++;
      } catch (error: any) {
        result.errors.push(`Failed to update comment ${id}: ${error.message}`);
      }
    }

    // Clear caches for affected posts
    for (const postId of postIds) {
      await this.cache.deleteByPattern(`comments:${postId}:*`);
      await this.cache.deleteByPattern(`comments:tree:${postId}:*`);
    }

    this.logger.info(`Bulk updated ${result.updated} comments to status ${status}`);
    return result;
  }

  async getCommentsByStatus(
    status: CommentStatusType,
    pagination?: PaginationParams
  ): Promise<PaginationResult<CommentDocument>> {
    const populateOptions = {
      populate: [
        { path: 'postId', select: 'title slug' },
        { path: 'author.userId', select: 'displayName avatar' }
      ]
    };

    return await this.findMany({ status }, pagination, populateOptions);
  }

  async getPendingComments(pagination?: PaginationParams): Promise<PaginationResult<CommentDocument>> {
    return await this.getCommentsByStatus('pending', pagination);
  }

  async getCommentsByAuthor(
    authorEmail: string,
    pagination?: PaginationParams
  ): Promise<PaginationResult<CommentDocument>> {
    const populateOptions = {
      populate: [
        { path: 'postId', select: 'title slug' }
      ]
    };

    return await this.findMany({ 'author.email': authorEmail }, pagination, populateOptions);
  }

  async getRecentComments(
    limit: number = 10,
    status: CommentStatusType = 'approved'
  ): Promise<CommentDocument[]> {
    const cacheKey = `comments:recent:${status}:${limit}`;
    let comments = await this.cache.get<CommentDocument[]>(cacheKey);

    if (!comments) {
      const result = await this.findMany(
        { status },
        { page: 1, limit, sort: 'createdAt', order: 'desc' },
        {
          populate: [
            { path: 'postId', select: 'title slug' },
            { path: 'author.userId', select: 'displayName avatar' }
          ]
        }
      );

      comments = result.data;
      await this.cache.set(cacheKey, comments, CACHE_TTL.SHORT);
    }

    return comments;
  }

  async getCommentStats(): Promise<{
    total: number;
    approved: number;
    pending: number;
    spam: number;
    trash: number;
  }> {
    const cacheKey = 'comments:stats';
    let stats = await this.cache.get<any>(cacheKey);

    if (!stats) {
      const [total, approved, pending, spam, trash] = await Promise.all([
        this.count({}),
        this.count({ status: 'approved' }),
        this.count({ status: 'pending' }),
        this.count({ status: 'spam' }),
        this.count({ status: 'trash' })
      ]);

      stats = { total, approved, pending, spam, trash };
      await this.cache.set(cacheKey, stats, CACHE_TTL.MEDIUM);
    }

    return stats;
  }

  async searchComments(
    query: string,
    options: {
      status?: CommentStatusType;
      postId?: string;
    } = {},
    pagination?: PaginationParams
  ): Promise<PaginationResult<CommentDocument>> {
    const filter: FilterQuery<CommentDocument> = {
      $text: { $search: query }
    };

    if (options.status) {
      filter.status = options.status;
    }

    if (options.postId) {
      filter.postId = options.postId;
    }

    const populateOptions = {
      populate: [
        { path: 'postId', select: 'title slug' },
        { path: 'author.userId', select: 'displayName avatar' }
      ]
    };

    return await this.findMany(filter, pagination, populateOptions);
  }

  async incrementLikeCount(id: string): Promise<CommentDocument> {
    const comment = await this.model.findByIdAndUpdate(
      id,
      { $inc: { likeCount: 1 } },
      { new: true }
    );

    if (!comment) {
      throw new NotFoundError('Comment');
    }

    // Clear relevant caches
    await this.cache.deleteByPattern(`comments:${comment.postId}:*`);

    return comment;
  }

  async incrementDislikeCount(id: string): Promise<CommentDocument> {
    const comment = await this.model.findByIdAndUpdate(
      id,
      { $inc: { dislikeCount: 1 } },
      { new: true }
    );

    if (!comment) {
      throw new NotFoundError('Comment');
    }

    // Clear relevant caches
    await this.cache.deleteByPattern(`comments:${comment.postId}:*`);

    return comment;
  }

  async getCommentsByUserId(
    userId: string,
    pagination?: PaginationParams
  ): Promise<PaginationResult<CommentDocument>> {
    const populateOptions = {
      populate: [
        { path: 'postId', select: 'title slug' }
      ]
    };

    return await this.findMany({ 'author.userId': userId }, pagination, populateOptions);
  }

  async moderateComment(
    id: string,
    action: 'approve' | 'reject' | 'spam' | 'trash',
    moderatorId: string
  ): Promise<CommentDocument> {
    const statusMap = {
      approve: 'approved',
      reject: 'spam',
      spam: 'spam',
      trash: 'trash'
    };

    const comment = await this.updateByIdOrThrow(id, {
      status: statusMap[action] as CommentStatusType,
      metadata: {
        ...await this.findByIdOrThrow(id).then(c => c.metadata),
        moderatedBy: moderatorId,
        moderatedAt: new Date(),
        moderationAction: action
      }
    });

    this.logger.info(`Comment ${id} ${action}d by moderator ${moderatorId}`);
    return comment;
  }
}