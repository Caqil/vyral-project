import { BaseService } from './base';
import { TagModel, TagDocument } from '../models/tag';
import { PostModel } from '../models/post';
import { Tag } from '../types/content';
import { PaginationParams, PaginationResult } from '../types/api';
import { ConflictError, NotFoundError } from '../errors';
import { CACHE_KEYS, CACHE_TTL } from '../constants';
import { CacheManager } from '../utils/cache';
import { FilterQuery } from 'mongoose';

export class TagService extends BaseService<TagDocument> {
  private cache: CacheManager;

  constructor() {
    super(TagModel, 'TagService');
    this.cache = CacheManager.getInstance();
  }

  async createTag(data: Partial<Tag>): Promise<TagDocument> {
    // Check for existing tag with same name or slug
    if (data.name) {
      const existingTag = await this.findOne({
        $or: [
          { name: data.name },
          { slug: data.slug }
        ]
      });

      if (existingTag) {
        throw new ConflictError('Tag with this name or slug already exists');
      }
    }

    const tag = await this.create(data);
    
    // Clear tag caches
    await this.cache.deleteByPattern('tags:*');
    
    this.logger.info(`Created tag: ${tag.name}`);
    return tag;
  }

  async getTagBySlug(slug: string): Promise<TagDocument | null> {
    let tag = await this.cache.get<TagDocument>(CACHE_KEYS.TAG(slug));
    
    if (!tag) {
      tag = await this.findOne({ slug });
      
      if (tag) {
        await this.cache.set(CACHE_KEYS.TAG(slug), tag, CACHE_TTL.LONG);
      }
    }

    return tag;
  }

  async getTagById(id: string): Promise<TagDocument | null> {
    let tag = await this.cache.get<TagDocument>(CACHE_KEYS.TAG(id));
    
    if (!tag) {
      tag = await this.findById(id);
      
      if (tag) {
        await this.cache.set(CACHE_KEYS.TAG(id), tag, CACHE_TTL.LONG);
        // Also cache by slug
        await this.cache.set(CACHE_KEYS.TAG(tag.slug), tag, CACHE_TTL.LONG);
      }
    }

    return tag;
  }

  async getAllTags(
    options: {
      search?: string;
      minPostCount?: number;
      maxPostCount?: number;
    } = {},
    pagination?: PaginationParams
  ): Promise<PaginationResult<TagDocument>> {
    const cacheKey = `tags:list:${JSON.stringify(options)}:${JSON.stringify(pagination)}`;
    let result = await this.cache.get<PaginationResult<TagDocument>>(cacheKey);

    if (!result) {
      const filter: FilterQuery<TagDocument> = {};

      if (options.search) {
        filter.$or = [
          { name: { $regex: options.search, $options: 'i' } },
          { description: { $regex: options.search, $options: 'i' } }
        ];
      }

      if (options.minPostCount !== undefined) {
        filter.postCount = { ...filter.postCount, $gte: options.minPostCount };
      }

      if (options.maxPostCount !== undefined) {
        filter.postCount = { ...filter.postCount, $lte: options.maxPostCount };
      }

      result = await this.findMany(filter, pagination);
      await this.cache.set(cacheKey, result, CACHE_TTL.MEDIUM);
    }

    return result;
  }

  async updateTag(id: string, data: Partial<Tag>): Promise<TagDocument> {
    const existingTag = await this.findByIdOrThrow(id);
    
    // Check for slug conflicts if updating name or slug
    if (data.name || data.slug) {
      const conflictFilter: any = {
        _id: { $ne: id }
      };

      if (data.name) {
        conflictFilter.$or = [{ name: data.name }];
      }
      
      if (data.slug) {
        conflictFilter.$or = conflictFilter.$or ? 
          [...conflictFilter.$or, { slug: data.slug }] : 
          [{ slug: data.slug }];
      }

      const conflictingTag = await this.findOne(conflictFilter);
      if (conflictingTag) {
        throw new ConflictError('Tag with this name or slug already exists');
      }
    }

    const updatedTag = await this.updateByIdOrThrow(id, data);
    
    // Clear caches
    await this.cache.delete(CACHE_KEYS.TAG(existingTag.slug));
    await this.cache.delete(CACHE_KEYS.TAG(id));
    await this.cache.deleteByPattern('tags:*');
    
    this.logger.info(`Updated tag: ${updatedTag.name}`);
    return updatedTag;
  }

  async deleteTag(id: string): Promise<void> {
    const tag = await this.findByIdOrThrow(id);
    
    // Remove tag from all posts
    await PostModel.updateMany(
      { tags: id },
      { $pull: { tags: id } }
    );
    
    await this.deleteByIdOrThrow(id);
    
    // Clear caches
    await this.cache.delete(CACHE_KEYS.TAG(tag.slug));
    await this.cache.delete(CACHE_KEYS.TAG(id));
    await this.cache.deleteByPattern('tags:*');
    await this.cache.deleteByPattern('posts:*'); // Clear post caches too
    
    this.logger.info(`Deleted tag: ${tag.name}`);
  }

  async getPopularTags(limit: number = 20): Promise<TagDocument[]> {
    const cacheKey = `tags:popular:${limit}`;
    let tags = await this.cache.get<TagDocument[]>(cacheKey);

    if (!tags) {
      const result = await this.findMany(
        { postCount: { $gt: 0 } },
        { page: 1, limit, sort: 'postCount', order: 'desc' }
      );

      tags = result.data;
      await this.cache.set(cacheKey, tags, CACHE_TTL.LONG);
    }

    return tags;
  }

  async getTagCloud(
    minCount: number = 1,
    maxTags: number = 50
  ): Promise<Array<{ tag: TagDocument; weight: number }>> {
    const cacheKey = `tags:cloud:${minCount}:${maxTags}`;
    let tagCloud = await this.cache.get<Array<{ tag: TagDocument; weight: number }>>(cacheKey);

    if (!tagCloud) {
      const tags = await this.model
        .find({ postCount: { $gte: minCount } })
        .sort({ postCount: -1 })
        .limit(maxTags)
        .lean();

      if (tags.length === 0) {
        return [];
      }

      const maxCount = tags[0].postCount;
      const minCountValue = Math.min(...tags.map(t => t.postCount));

      tagCloud = tags.map(tag => ({
        tag,
        weight: maxCount === minCountValue ? 1 : 
          (tag.postCount - minCountValue) / (maxCount - minCountValue)
      }));

      await this.cache.set(cacheKey, tagCloud, CACHE_TTL.LONG);
    }

    return tagCloud;
  }

  async searchTags(query: string, limit: number = 10): Promise<TagDocument[]> {
    const cacheKey = `tags:search:${query}:${limit}`;
    let tags = await this.cache.get<TagDocument[]>(cacheKey);

    if (!tags) {
      const result = await this.findMany(
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } }
          ]
        },
        { page: 1, limit, sort: 'postCount', order: 'desc' }
      );

      tags = result.data;
      await this.cache.set(cacheKey, tags, CACHE_TTL.MEDIUM);
    }

    return tags;
  }

  async getTagsByIds(ids: string[]): Promise<TagDocument[]> {
    if (ids.length === 0) return [];

    // Try to get from cache first
    const cachedTags: TagDocument[] = [];
    const uncachedIds: string[] = [];

    for (const id of ids) {
      const cached = await this.cache.get<TagDocument>(CACHE_KEYS.TAG(id));
      if (cached) {
        cachedTags.push(cached);
      } else {
        uncachedIds.push(id);
      }
    }

    // Fetch uncached tags
    let uncachedTags: TagDocument[] = [];
    if (uncachedIds.length > 0) {
      const result = await this.findMany({ _id: { $in: uncachedIds } });
      uncachedTags = result.data;

      // Cache the fetched tags
      for (const tag of uncachedTags) {
        await this.cache.set(CACHE_KEYS.TAG(tag._id), tag, CACHE_TTL.LONG);
        await this.cache.set(CACHE_KEYS.TAG(tag.slug), tag, CACHE_TTL.LONG);
      }
    }

    return [...cachedTags, ...uncachedTags];
  }

  async getOrCreateTags(tagNames: string[]): Promise<TagDocument[]> {
    const tags: TagDocument[] = [];
    
    for (const name of tagNames) {
      let tag = await this.findOne({ name: name.trim() });
      
      if (!tag) {
        tag = await this.createTag({
          name: name.trim(),
          description: `Tag for ${name.trim()}`
        });
      }
      
      tags.push(tag);
    }

    return tags;
  }

  async updatePostCount(tagId: string, increment: number = 0): Promise<void> {
    await this.model.findByIdAndUpdate(
      tagId,
      { $inc: { postCount: increment } }
    );

    // Clear caches
    await this.cache.delete(CACHE_KEYS.TAG(tagId));
    await this.cache.deleteByPattern('tags:*');
  }

  async recalculatePostCounts(): Promise<{ updated: number }> {
    const tags = await this.model.find();
    let updated = 0;

    for (const tag of tags) {
      const postCount = await PostModel.countDocuments({
        tags: tag._id,
        status: 'published'
      });

      await this.model.findByIdAndUpdate(tag._id, { postCount });
      updated++;
    }

    // Clear all tag caches
    await this.cache.deleteByPattern('tags:*');

    this.logger.info(`Recalculated post counts for ${updated} tags`);
    return { updated };
  }

  async getTagStats(): Promise<{
    total: number;
    withPosts: number;
    withoutPosts: number;
    averagePostCount: number;
    mostUsed: TagDocument | null;
  }> {
    const cacheKey = 'tags:stats';
    let stats = await this.cache.get<any>(cacheKey);

    if (!stats) {
      const [total, withPosts, withoutPosts] = await Promise.all([
        this.count({}),
        this.count({ postCount: { $gt: 0 } }),
        this.count({ postCount: 0 })
      ]);

      const avgResult = await this.model.aggregate([
        { $group: { _id: null, avgPostCount: { $avg: '$postCount' } } }
      ]);
      const averagePostCount = avgResult[0]?.avgPostCount || 0;

      const mostUsedResult = await this.model.findOne().sort({ postCount: -1 });

      stats = {
        total,
        withPosts,
        withoutPosts,
        averagePostCount: Math.round(averagePostCount * 100) / 100,
        mostUsed: mostUsedResult
      };

      await this.cache.set(cacheKey, stats, CACHE_TTL.MEDIUM);
    }

    return stats;
  }

  async bulkDelete(ids: string[]): Promise<{ deleted: number; errors: string[] }> {
    const result = { deleted: 0, errors: [] as string[] };

    for (const id of ids) {
      try {
        await this.deleteTag(id);
        result.deleted++;
      } catch (error: any) {
        result.errors.push(`Failed to delete tag ${id}: ${error.message}`);
      }
    }

    this.logger.info(`Bulk deleted ${result.deleted} tags`);
    return result;
  }

  async mergeTag(sourceId: string, targetId: string): Promise<TagDocument> {
    const [sourceTag, targetTag] = await Promise.all([
      this.findByIdOrThrow(sourceId),
      this.findByIdOrThrow(targetId)
    ]);

    // Move all posts from source tag to target tag
    await PostModel.updateMany(
      { tags: sourceId },
      { 
        $pull: { tags: sourceId },
        $addToSet: { tags: targetId }
      }
    );

    // Update target tag post count
    const newPostCount = await PostModel.countDocuments({
      tags: targetId,
      status: 'published'
    });

    const updatedTargetTag = await this.updateByIdOrThrow(targetId, {
      postCount: newPostCount
    });

    // Delete source tag
    await this.deleteTag(sourceId);

    this.logger.info(`Merged tag ${sourceTag.name} into ${targetTag.name}`);
    return updatedTargetTag;
  }
}