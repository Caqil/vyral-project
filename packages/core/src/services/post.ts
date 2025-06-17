import { FilterQuery } from 'mongoose';
import { BaseService } from './base';
import { PostModel, PostDocument } from '../models/post';
import { CategoryModel } from '../models/category';
import { TagModel } from '../models/tag';
import { PaginationParams, PaginationResult } from '../types/api';
import { NotFoundError, ValidationError } from '../errors';
import { CACHE_KEYS, CACHE_TTL } from '../constants';
import { CacheManager } from '../utils/cache';
import { Post } from '../types/content';
import { ContentStatusType } from '../types/core';

export class PostService extends BaseService<PostDocument> {
  private cache: CacheManager;

  constructor() {
    super(PostModel, 'PostService');
    this.cache = CacheManager.getInstance();
  }

  async createPost(data: Partial<Post>): Promise<PostDocument> {
    // Validate categories and tags exist
    if (data.categories?.length) {
      const categoryCount = await CategoryModel.countDocuments({
        _id: { $in: data.categories }
      });
      if (categoryCount !== data.categories.length) {
        throw new ValidationError('One or more categories do not exist');
      }
    }

    if (data.tags?.length) {
      const tagCount = await TagModel.countDocuments({
        _id: { $in: data.tags }
      });
      if (tagCount !== data.tags.length) {
        throw new ValidationError('One or more tags do not exist');
      }
    }

    const post = await this.create(data);
    
    // Update category and tag post counts
    if (data.categories?.length) {
      await CategoryModel.updateMany(
        { _id: { $in: data.categories } },
        { $inc: { postCount: 1 } }
      );
    }

    if (data.tags?.length) {
      await TagModel.updateMany(
        { _id: { $in: data.tags } },
        { $inc: { postCount: 1 } }
      );
    }

    // Clear cache
    await this.cache.deleteByPattern('posts:*');
    
    return post;
  }

  async getPostBySlug(slug: string, includePrivate: boolean = false): Promise<PostDocument | null> {
    const cacheKey = CACHE_KEYS.POST(slug);
    let post = await this.cache.get<PostDocument>(cacheKey);

    if (!post) {
      const filter: FilterQuery<PostDocument> = { slug };
      if (!includePrivate) {
        filter.status = { $in: ['published'] };
      }

      post = await this.model
        .findOne(filter)
        .populate('author', 'displayName avatar')
        .populate('categories', 'name slug')
        .populate('tags', 'name slug')
        .populate('featuredImage');

      if (post) {
        await this.cache.set(cacheKey, post, CACHE_TTL.MEDIUM);
      }
    }

    return post;
  }

  async getPublishedPosts(
    pagination?: PaginationParams,
    filters?: {
      category?: string;
      tag?: string;
      author?: string;
      search?: string;
    }
  ): Promise<PaginationResult<PostDocument>> {
    const cacheKey = CACHE_KEYS.POST_LIST(JSON.stringify({ pagination, filters }));
    let result = await this.cache.get<PaginationResult<PostDocument>>(cacheKey);

    if (!result) {
      const filter: FilterQuery<PostDocument> = {
        status: 'published',
        publishedAt: { $lte: new Date() }
      };

      if (filters?.category) {
        filter.categories = filters.category;
      }

      if (filters?.tag) {
        filter.tags = filters.tag;
      }

      if (filters?.author) {
        filter.author = filters.author;
      }

      if (filters?.search) {
        filter.$text = { $search: filters.search };
      }

      const options = {
        populate: [
          { path: 'author', select: 'displayName avatar' },
          { path: 'categories', select: 'name slug' },
          { path: 'tags', select: 'name slug' },
          { path: 'featuredImage' }
        ]
      };

      result = await this.findMany(filter, pagination, options);
      await this.cache.set(cacheKey, result, CACHE_TTL.SHORT);
    }

    return result;
  }

  async updatePost(id: string, data: Partial<Post>): Promise<PostDocument> {
    const existingPost = await this.findByIdOrThrow(id);
    
    // Handle category changes
    if (data.categories !== undefined) {
      const oldCategories = existingPost.categories?.map(c => c.toString()) || [];
      const newCategories = data.categories || [];
      
      const removedCategories = oldCategories.filter(c => !newCategories.includes(c));
      const addedCategories = newCategories.filter(c => !oldCategories.includes(c));
      
      if (removedCategories.length) {
        await CategoryModel.updateMany(
          { _id: { $in: removedCategories } },
          { $inc: { postCount: -1 } }
        );
      }
      
      if (addedCategories.length) {
        await CategoryModel.updateMany(
          { _id: { $in: addedCategories } },
          { $inc: { postCount: 1 } }
        );
      }
    }

    // Handle tag changes
    if (data.tags !== undefined) {
      const oldTags = existingPost.tags?.map(t => t.toString()) || [];
      const newTags = data.tags || [];
      
      const removedTags = oldTags.filter(t => !newTags.includes(t));
      const addedTags = newTags.filter(t => !oldTags.includes(t));
      
      if (removedTags.length) {
        await TagModel.updateMany(
          { _id: { $in: removedTags } },
          { $inc: { postCount: -1 } }
        );
      }
      
      if (addedTags.length) {
        await TagModel.updateMany(
          { _id: { $in: addedTags } },
          { $inc: { postCount: 1 } }
        );
      }
    }

    const updatedPost = await this.updateByIdOrThrow(id, data);
    
    // Clear cache
    await this.cache.delete(CACHE_KEYS.POST(existingPost.slug));
    await this.cache.deleteByPattern('posts:*');
    
    return updatedPost;
  }

  async deletePost(id: string): Promise<void> {
    const post = await this.findByIdOrThrow(id);
    
    // Update category and tag post counts
    if (post.categories?.length) {
      await CategoryModel.updateMany(
        { _id: { $in: post.categories } },
        { $inc: { postCount: -1 } }
      );
    }

    if (post.tags?.length) {
      await TagModel.updateMany(
        { _id: { $in: post.tags } },
        { $inc: { postCount: -1 } }
      );
    }

    await this.deleteByIdOrThrow(id);
    
    // Clear cache
    await this.cache.delete(CACHE_KEYS.POST(post.slug));
    await this.cache.deleteByPattern('posts:*');
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.model.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
  }

  async getRelatedPosts(postId: string, limit: number = 5): Promise<PostDocument[]> {
    const post = await this.findByIdOrThrow(postId);
    
    return await this.model
      .find({
        _id: { $ne: postId },
        status: 'published',
        $or: [
          { categories: { $in: post.categories } },
          { tags: { $in: post.tags } }
        ]
      })
      .limit(limit)
      .populate('author', 'displayName avatar')
      .populate('featuredImage')
      .sort('-publishedAt');
  }

  async getPostsByStatus(status: ContentStatusType, pagination?: PaginationParams): Promise<PaginationResult<PostDocument>> {
    return this.findMany({ status }, pagination, {
      populate: [
        { path: 'author', select: 'displayName avatar' },
        { path: 'categories', select: 'name slug' },
        { path: 'tags', select: 'name slug' }
      ]
    });
  }

  async searchPosts(query: string, pagination?: PaginationParams): Promise<PaginationResult<PostDocument>> {
    const filter = {
      $text: { $search: query },
      status: 'published'
    };

    return this.findMany(filter, pagination, {
      populate: [
        { path: 'author', select: 'displayName avatar' },
        { path: 'categories', select: 'name slug' },
        { path: 'tags', select: 'name slug' },
        { path: 'featuredImage' }
      ]
    });
  }
}