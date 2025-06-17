import { BaseService } from './base';
import { CategoryModel, CategoryDocument } from '../models/category';
import { PostModel } from '../models/post';
import { Category } from '../types/content';
import { PaginationParams, PaginationResult } from '../types/api';
import { ConflictError, NotFoundError, ValidationError } from '../errors';
import { CACHE_KEYS, CACHE_TTL } from '../constants';
import { CacheManager } from '../utils/cache';
import { FilterQuery } from 'mongoose';

export class CategoryService extends BaseService<CategoryDocument> {
  private cache: CacheManager;

  constructor() {
    super(CategoryModel, 'CategoryService');
    this.cache = CacheManager.getInstance();
  }

  async createCategory(data: Partial<Category>): Promise<CategoryDocument> {
    // Check for existing category with same name or slug
    if (data.name) {
      const existingCategory = await this.findOne({
        $or: [
          { name: data.name },
          { slug: data.slug }
        ]
      });

      if (existingCategory) {
        throw new ConflictError('Category with this name or slug already exists');
      }
    }

    // Validate parent category exists if specified
    if (data.parent) {
      const parentCategory = await this.findById(data.parent);
      if (!parentCategory) {
        throw new ValidationError('Parent category does not exist');
      }
    }

    const category = await this.create(data);
    
    // Clear category caches
    await this.cache.deleteByPattern('categories:*');
    
    this.logger.info(`Created category: ${category.name}`);
    return category;
  }

  async getCategoryBySlug(slug: string): Promise<CategoryDocument | null> {
    let category = await this.cache.get<CategoryDocument>(CACHE_KEYS.CATEGORY(slug));
    
    if (!category) {
      category = await this.findOne({ slug }, {
        populate: [
          { path: 'parent', select: 'name slug' },
          { path: 'image' }
        ]
      });
      
      if (category) {
        await this.cache.set(CACHE_KEYS.CATEGORY(slug), category, CACHE_TTL.LONG);
      }
    }

    return category;
  }

  async getCategoryById(id: string): Promise<CategoryDocument | null> {
    let category = await this.cache.get<CategoryDocument>(CACHE_KEYS.CATEGORY(id));
    
    if (!category) {
      category = await this.findById(id, {
        populate: [
          { path: 'parent', select: 'name slug' },
          { path: 'image' }
        ]
      });
      
      if (category) {
        await this.cache.set(CACHE_KEYS.CATEGORY(id), category, CACHE_TTL.LONG);
        // Also cache by slug
        await this.cache.set(CACHE_KEYS.CATEGORY(category.slug), category, CACHE_TTL.LONG);
      }
    }

    return category;
  }

  async getAllCategories(
    options: {
      search?: string;
      parent?: string | null;
      hasParent?: boolean;
      minPostCount?: number;
      maxPostCount?: number;
    } = {},
    pagination?: PaginationParams
  ): Promise<PaginationResult<CategoryDocument>> {
    const cacheKey = `categories:list:${JSON.stringify(options)}:${JSON.stringify(pagination)}`;
    let result = await this.cache.get<PaginationResult<CategoryDocument>>(cacheKey);

    if (!result) {
      const filter: FilterQuery<CategoryDocument> = {};

      if (options.search) {
        filter.$or = [
          { name: { $regex: options.search, $options: 'i' } },
          { description: { $regex: options.search, $options: 'i' } }
        ];
      }

      if (options.parent !== undefined) {
        filter.parent = options.parent;
      }

      if (options.hasParent !== undefined) {
        filter.parent = options.hasParent ? { $exists: true } : { $exists: false };
      }

      if (options.minPostCount !== undefined) {
        filter.postCount = { ...filter.postCount, $gte: options.minPostCount };
      }

      if (options.maxPostCount !== undefined) {
        filter.postCount = { ...filter.postCount, $lte: options.maxPostCount };
      }

      const populateOptions = {
        populate: [
          { path: 'parent', select: 'name slug' },
          { path: 'image', select: 'url alt' }
        ]
      };

      result = await this.findMany(filter, pagination, populateOptions);
      await this.cache.set(cacheKey, result, CACHE_TTL.MEDIUM);
    }

    return result;
  }

  async getCategoryTree(): Promise<any[]> {
    const cacheKey = 'categories:tree';
    let tree = await this.cache.get<any[]>(cacheKey);

    if (!tree) {
      // Get all categories
      const allCategories = await this.model
        .find()
        .populate('parent', 'name slug')
        .populate('image', 'url alt')
        .sort({ order: 1, name: 1 })
        .lean();

      tree = this.buildCategoryTree(allCategories);
      await this.cache.set(cacheKey, tree, CACHE_TTL.LONG);
    }

    return tree;
  }

  private buildCategoryTree(categories: any[]): any[] {
    const categoryMap = new Map();
    const roots: any[] = [];

    // Create category objects with children arrays
    categories.forEach(category => {
      categoryMap.set(category._id.toString(), { ...category, children: [] });
    });

    // Build the tree structure
    categories.forEach(category => {
      const categoryObj = categoryMap.get(category._id.toString());
      if (category.parent && categoryMap.has(category.parent._id?.toString())) {
        categoryMap.get(category.parent._id.toString()).children.push(categoryObj);
      } else {
        roots.push(categoryObj);
      }
    });

    return roots;
  }

  async updateCategory(id: string, data: Partial<Category>): Promise<CategoryDocument> {
    const existingCategory = await this.findByIdOrThrow(id);
    
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

      const conflictingCategory = await this.findOne(conflictFilter);
      if (conflictingCategory) {
        throw new ConflictError('Category with this name or slug already exists');
      }
    }

    // Prevent circular references when updating parent
    if (data.parent) {
      if (data.parent === id) {
        throw new ValidationError('Category cannot be its own parent');
      }

      // Check if the new parent would create a circular reference
      const wouldCreateCircle = await this.wouldCreateCircularReference(id, data.parent);
      if (wouldCreateCircle) {
        throw new ValidationError('Setting this parent would create a circular reference');
      }
    }

    const updatedCategory = await this.updateByIdOrThrow(id, data);
    
    // Clear caches
    await this.cache.delete(CACHE_KEYS.CATEGORY(existingCategory.slug));
    await this.cache.delete(CACHE_KEYS.CATEGORY(id));
    await this.cache.deleteByPattern('categories:*');
    
    this.logger.info(`Updated category: ${updatedCategory.name}`);
    return updatedCategory;
  }

  private async wouldCreateCircularReference(categoryId: string, newParentId: string): Promise<boolean> {
    let currentId = newParentId;
    
    while (currentId) {
      if (currentId === categoryId) {
        return true;
      }
      
      const parent = await this.findById(currentId);
      currentId = parent?.parent?.toString();
    }
    
    return false;
  }

  async deleteCategory(id: string, reassignToParent: boolean = false): Promise<void> {
    const category = await this.findByIdOrThrow(id);
    
    // Handle child categories
    const childCategories = await this.findMany({ parent: id });
    
    if (childCategories.data.length > 0) {
      if (reassignToParent) {
        // Move child categories to this category's parent
        await this.model.updateMany(
          { parent: id },
          { parent: category.parent }
        );
      } else {
        throw new ValidationError('Cannot delete category with child categories. Delete children first or use reassignToParent option.');
      }
    }
    
    // Remove category from all posts
    await PostModel.updateMany(
      { categories: id },
      { $pull: { categories: id } }
    );
    
    await this.deleteByIdOrThrow(id);
    
    // Clear caches
    await this.cache.delete(CACHE_KEYS.CATEGORY(category.slug));
    await this.cache.delete(CACHE_KEYS.CATEGORY(id));
    await this.cache.deleteByPattern('categories:*');
    await this.cache.deleteByPattern('posts:*'); // Clear post caches too
    
    this.logger.info(`Deleted category: ${category.name}`);
  }

  async getRootCategories(): Promise<CategoryDocument[]> {
    const cacheKey = 'categories:roots';
    let categories = await this.cache.get<CategoryDocument[]>(cacheKey);

    if (!categories) {
      const result = await this.findMany(
        { parent: { $exists: false } },
        { sort: 'order', order: 'asc' },
        {
          populate: [
            { path: 'image', select: 'url alt' }
          ]
        }
      );

      categories = result.data;
      await this.cache.set(cacheKey, categories, CACHE_TTL.LONG);
    }

    return categories;
  }

  async getChildCategories(parentId: string): Promise<CategoryDocument[]> {
    const cacheKey = `categories:children:${parentId}`;
    let categories = await this.cache.get<CategoryDocument[]>(cacheKey);

    if (!categories) {
      const result = await this.findMany(
        { parent: parentId },
        { sort: 'order', order: 'asc' },
        {
          populate: [
            { path: 'image', select: 'url alt' }
          ]
        }
      );

      categories = result.data;
      await this.cache.set(cacheKey, categories, CACHE_TTL.LONG);
    }

    return categories;
  }

  async getCategoryPath(categoryId: string): Promise<CategoryDocument[]> {
    const path: CategoryDocument[] = [];
    let currentId = categoryId;

    while (currentId) {
      const category = await this.findById(currentId, {
        populate: { path: 'parent', select: 'name slug' }
      });
      
      if (!category) break;
      
      path.unshift(category);
      currentId = category.parent?._id?.toString();
    }

    return path;
  }

  async searchCategories(query: string, limit: number = 10): Promise<CategoryDocument[]> {
    const cacheKey = `categories:search:${query}:${limit}`;
    let categories = await this.cache.get<CategoryDocument[]>(cacheKey);

    if (!categories) {
      const result = await this.findMany(
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } }
          ]
        },
        { page: 1, limit, sort: 'postCount', order: 'desc' },
        {
          populate: [
            { path: 'parent', select: 'name slug' },
            { path: 'image', select: 'url alt' }
          ]
        }
      );

      categories = result.data;
      await this.cache.set(cacheKey, categories, CACHE_TTL.MEDIUM);
    }

    return categories;
  }

  async getCategoriesByIds(ids: string[]): Promise<CategoryDocument[]> {
    if (ids.length === 0) return [];

    // Try to get from cache first
    const cachedCategories: CategoryDocument[] = [];
    const uncachedIds: string[] = [];

    for (const id of ids) {
      const cached = await this.cache.get<CategoryDocument>(CACHE_KEYS.CATEGORY(id));
      if (cached) {
        cachedCategories.push(cached);
      } else {
        uncachedIds.push(id);
      }
    }

    // Fetch uncached categories
    let uncachedCategories: CategoryDocument[] = [];
    if (uncachedIds.length > 0) {
      const result = await this.findMany(
        { _id: { $in: uncachedIds } },
        undefined,
        {
          populate: [
            { path: 'parent', select: 'name slug' },
            { path: 'image', select: 'url alt' }
          ]
        }
      );
      uncachedCategories = result.data;

      // Cache the fetched categories
      for (const category of uncachedCategories) {
        await this.cache.set(CACHE_KEYS.CATEGORY(category._id), category, CACHE_TTL.LONG);
        await this.cache.set(CACHE_KEYS.CATEGORY(category.slug), category, CACHE_TTL.LONG);
      }
    }

    return [...cachedCategories, ...uncachedCategories];
  }

  async updatePostCount(categoryId: string, increment: number = 0): Promise<void> {
    await this.model.findByIdAndUpdate(
      categoryId,
      { $inc: { postCount: increment } }
    );

    // Clear caches
    await this.cache.delete(CACHE_KEYS.CATEGORY(categoryId));
    await this.cache.deleteByPattern('categories:*');
  }

  async recalculatePostCounts(): Promise<{ updated: number }> {
    const categories = await this.model.find();
    let updated = 0;

    for (const category of categories) {
      const postCount = await PostModel.countDocuments({
        categories: category._id,
        status: 'published'
      });

      await this.model.findByIdAndUpdate(category._id, { postCount });
      updated++;
    }

    // Clear all category caches
    await this.cache.deleteByPattern('categories:*');

    this.logger.info(`Recalculated post counts for ${updated} categories`);
    return { updated };
  }

  async reorderCategories(parentId: string | null, categoryOrders: Array<{ id: string; order: number }>): Promise<void> {
    for (const { id, order } of categoryOrders) {
      await this.updateByIdOrThrow(id, { order });
    }

    // Clear caches
    await this.cache.deleteByPattern('categories:*');

    this.logger.info(`Reordered ${categoryOrders.length} categories`);
  }

  async getCategoryStats(): Promise<{
    total: number;
    withPosts: number;
    withoutPosts: number;
    rootCategories: number;
    averagePostCount: number;
    mostUsed: CategoryDocument | null;
  }> {
    const cacheKey = 'categories:stats';
    let stats = await this.cache.get<any>(cacheKey);

    if (!stats) {
      const [total, withPosts, withoutPosts, rootCategories] = await Promise.all([
        this.count({}),
        this.count({ postCount: { $gt: 0 } }),
        this.count({ postCount: 0 }),
        this.count({ parent: { $exists: false } })
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
        rootCategories,
        averagePostCount: Math.round(averagePostCount * 100) / 100,
        mostUsed: mostUsedResult
      };

      await this.cache.set(cacheKey, stats, CACHE_TTL.MEDIUM);
    }

    return stats;
  }

  async bulkDelete(ids: string[], reassignToParent: boolean = false): Promise<{ deleted: number; errors: string[] }> {
    const result = { deleted: 0, errors: [] as string[] };

    for (const id of ids) {
      try {
        await this.deleteCategory(id, reassignToParent);
        result.deleted++;
      } catch (error: any) {
        result.errors.push(`Failed to delete category ${id}: ${error.message}`);
      }
    }

    this.logger.info(`Bulk deleted ${result.deleted} categories`);
    return result;
  }

  async moveCategory(categoryId: string, newParentId: string | null): Promise<CategoryDocument> {
    // Validate the move wouldn't create circular reference
    if (newParentId) {
      const wouldCreateCircle = await this.wouldCreateCircularReference(categoryId, newParentId);
      if (wouldCreateCircle) {
        throw new ValidationError('Moving to this parent would create a circular reference');
      }
    }

    const updatedCategory = await this.updateByIdOrThrow(categoryId, {
      parent: newParentId
    });

    this.logger.info(`Moved category ${categoryId} to parent ${newParentId || 'root'}`);
    return updatedCategory;
  }
}