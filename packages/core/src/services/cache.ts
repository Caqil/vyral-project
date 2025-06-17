import { CacheManager } from '../utils/cache';
import { Logger } from '../utils/logger';
import { CACHE_KEYS, CACHE_TTL } from '../constants';

export class CacheService {
  private cache: CacheManager;
  private logger: Logger;

  constructor() {
    this.cache = CacheManager.getInstance();
    this.logger = new Logger('CacheService');
  }

  // Generic cache operations
  async get<T>(key: string): Promise<T | null> {
    try {
      return await this.cache.get<T>(key);
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number, tags?: string[]): Promise<void> {
    try {
      await this.cache.set(key, value, ttl || CACHE_TTL.MEDIUM, tags || []);
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      return await this.cache.delete(key);
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}:`, error);
      return false;
    }
  }

  async deleteByPattern(pattern: string): Promise<number> {
    try {
      return await this.cache.deleteByPattern(pattern);
    } catch (error) {
      this.logger.error(`Failed to delete by pattern ${pattern}:`, error);
      return 0;
    }
  }

  async deleteByTag(tag: string): Promise<number> {
    try {
      return await this.cache.deleteByTag(tag);
    } catch (error) {
      this.logger.error(`Failed to delete by tag ${tag}:`, error);
      return 0;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.cache.clear();
      this.logger.info('Cache cleared successfully');
    } catch (error) {
      this.logger.error('Failed to clear cache:', error);
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      return await this.cache.has(key);
    } catch (error) {
      this.logger.error(`Failed to check cache key ${key}:`, error);
      return false;
    }
  }

  // Content-specific cache operations
  async cachePost(postId: string, post: any, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
    await this.set(CACHE_KEYS.POST(postId), post, ttl, ['posts', 'content']);
  }

  async getCachedPost(postId: string): Promise<any> {
    return await this.get(CACHE_KEYS.POST(postId));
  }

  async invalidatePost(postId: string): Promise<void> {
    await this.delete(CACHE_KEYS.POST(postId));
    await this.deleteByPattern('posts:*');
  }

  async cachePostList(params: string, posts: any, ttl: number = CACHE_TTL.SHORT): Promise<void> {
    await this.set(CACHE_KEYS.POST_LIST(params), posts, ttl, ['posts', 'lists']);
  }

  async getCachedPostList(params: string): Promise<any> {
    return await this.get(CACHE_KEYS.POST_LIST(params));
  }

  async invalidatePostLists(): Promise<void> {
    await this.deleteByPattern('posts:*');
  }

  // User-specific cache operations
  async cacheUser(userId: string, user: any, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
    await this.set(CACHE_KEYS.USER(userId), user, ttl, ['users']);
  }

  async getCachedUser(userId: string): Promise<any> {
    return await this.get(CACHE_KEYS.USER(userId));
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.delete(CACHE_KEYS.USER(userId));
  }

  // Category-specific cache operations
  async cacheCategory(categoryId: string, category: any, ttl: number = CACHE_TTL.LONG): Promise<void> {
    await this.set(CACHE_KEYS.CATEGORY(categoryId), category, ttl, ['categories', 'taxonomy']);
  }

  async getCachedCategory(categoryId: string): Promise<any> {
    return await this.get(CACHE_KEYS.CATEGORY(categoryId));
  }

  async invalidateCategory(categoryId: string): Promise<void> {
    await this.delete(CACHE_KEYS.CATEGORY(categoryId));
    await this.deleteByTag('categories');
  }

  // Tag-specific cache operations
  async cacheTag(tagId: string, tag: any, ttl: number = CACHE_TTL.LONG): Promise<void> {
    await this.set(CACHE_KEYS.TAG(tagId), tag, ttl, ['tags', 'taxonomy']);
  }

  async getCachedTag(tagId: string): Promise<any> {
    return await this.get(CACHE_KEYS.TAG(tagId));
  }

  async invalidateTag(tagId: string): Promise<void> {
    await this.delete(CACHE_KEYS.TAG(tagId));
    await this.deleteByTag('tags');
  }

  // Settings cache operations
  async cacheSettings(settings: any, ttl: number = CACHE_TTL.VERY_LONG): Promise<void> {
    await this.set(CACHE_KEYS.SETTINGS, settings, ttl, ['settings']);
  }

  async getCachedSettings(): Promise<any> {
    return await this.get(CACHE_KEYS.SETTINGS);
  }

  async invalidateSettings(): Promise<void> {
    await this.delete(CACHE_KEYS.SETTINGS);
  }

  // Navigation cache operations
  async cacheNavigation(location: string, navigation: any, ttl: number = CACHE_TTL.LONG): Promise<void> {
    await this.set(CACHE_KEYS.NAVIGATION(location), navigation, ttl, ['navigation']);
  }

  async getCachedNavigation(location: string): Promise<any> {
    return await this.get(CACHE_KEYS.NAVIGATION(location));
  }

  async invalidateNavigation(location?: string): Promise<void> {
    if (location) {
      await this.delete(CACHE_KEYS.NAVIGATION(location));
    } else {
      await this.deleteByTag('navigation');
    }
  }

  // Bulk operations
  async invalidateContentCache(): Promise<void> {
    await this.deleteByTag('content');
    await this.deleteByTag('posts');
    await this.deleteByTag('taxonomy');
  }

  async invalidateUserCache(): Promise<void> {
    await this.deleteByTag('users');
  }

  async invalidateSystemCache(): Promise<void> {
    await this.deleteByTag('settings');
    await this.deleteByTag('navigation');
  }

  // Cache statistics
  getStats(): { size: number; keys: string[] } {
    return this.cache.getStats();
  }

  // Warm cache operations
  async warmCache(keys: string[], fetcher: (key: string) => Promise<any>): Promise<void> {
    const promises = keys.map(async (key) => {
      try {
        const exists = await this.has(key);
        if (!exists) {
          const data = await fetcher(key);
          if (data) {
            await this.set(key, data);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to warm cache for key ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
    this.logger.info(`Cache warming completed for ${keys.length} keys`);
  }

  // Start periodic cleanup
  startCleanup(intervalMs: number = 300000): void {
    this.cache.startCleanup(intervalMs);
  }
}