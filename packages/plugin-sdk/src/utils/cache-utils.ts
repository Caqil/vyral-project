/**
 * Cache utility functions for the core package
 */

import { CacheManager } from '@vyral/core';
import { Logger } from './logger';

export interface CacheKeyOptions {
  prefix?: string;
  separator?: string;
  normalize?: boolean;
}

export interface CacheStrategyOptions {
  ttl?: number;
  tags?: string[];
  staleWhileRevalidate?: boolean;
  maxAge?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  size: number;
  keys: string[];
}

const logger = new Logger('CacheUtils');

/**
 * Generate standardized cache key
 */
export function generateCacheKey(
  parts: (string | number)[], 
  options: CacheKeyOptions = {}
): string {
  const { prefix, separator = ':', normalize = true } = options;
  
  let keyParts = parts.map(part => String(part));
  
  if (normalize) {
    keyParts = keyParts.map(part => 
      part.toLowerCase().replace(/[^a-z0-9-_]/g, '_')
    );
  }
  
  const key = keyParts.join(separator);
  return prefix ? `${prefix}${separator}${key}` : key;
}

/**
 * Generate cache key for user-specific data
 */
export function userCacheKey(userId: string, resource: string, id?: string): string {
  const parts = ['user', userId, resource];
  if (id) parts.push(id);
  return generateCacheKey(parts);
}

/**
 * Generate cache key for content
 */
export function contentCacheKey(type: string, id: string, variant?: string): string {
  const parts = [type, id];
  if (variant) parts.push(variant);
  return generateCacheKey(parts);
}

/**
 * Generate cache key for API responses
 */
export function apiCacheKey(endpoint: string, params?: Record<string, any>): string {
  const parts = ['api', endpoint];
  
  if (params && Object.keys(params).length > 0) {
    // Sort params for consistent key generation
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${String(params[key])}`)
      .join('&');
    parts.push(sortedParams);
  }
  
  return generateCacheKey(parts);
}

/**
 * Generate cache key for database queries
 */
export function queryCacheKey(collection: string, query: any, options?: any): string {
  const queryString = JSON.stringify(query);
  const optionsString = options ? JSON.stringify(options) : '';
  return generateCacheKey(['query', collection, queryString, optionsString]);
}

/**
 * Cache decorator for functions
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  keyGenerator: (...args: Parameters<T>) => string,
  options: CacheStrategyOptions = {}
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: Parameters<T>) {
      const cache = CacheManager.getInstance();
      const key = keyGenerator(...args);
      
      try {
        // Try to get from cache
        const cached = await cache.get<Awaited<ReturnType<T>>>(key);
        if (cached !== null) {
          logger.debug(`Cache hit for key: ${key}`);
          return cached;
        }
        
        // Execute original method
        logger.debug(`Cache miss for key: ${key}`);
        const result = await method.apply(this, args);
        
        // Store in cache
        await cache.set(key, result, options.ttl, options.tags);
        
        return result;
      } catch (error) {
        logger.error(`Cache error for key ${key}:`, error);
        // Fallback to original method
        return await method.apply(this, args);
      }
    };
  };
}

/**
 * Memoize function with cache
 */
export function memoize<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  options: CacheStrategyOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    const cache = CacheManager.getInstance();
    const key = keyGenerator(...args);
    
    try {
      const cached = await cache.get<Awaited<ReturnType<T>>>(key);
      if (cached !== null) {
        return cached;
      }
      
      const result = await fn(...args);
      await cache.set(key, result, options.ttl, options.tags);
      
      return result;
    } catch (error) {
      logger.error(`Memoization error for key ${key}:`, error);
      return await fn(...args);
    }
  }) as T;
}

/**
 * Cache warming utility
 */
export class CacheWarmer {
  private cache: CacheManager;
  private logger: Logger;
  
  constructor() {
    this.cache = CacheManager.getInstance();
    this.logger = new Logger('CacheWarmer');
  }
  
  /**
   * Warm cache with data
   */
  async warm<T>(
    key: string, 
    dataFetcher: () => Promise<T>, 
    options: CacheStrategyOptions = {}
  ): Promise<T> {
    try {
      this.logger.debug(`Warming cache for key: ${key}`);
      const data = await dataFetcher();
      await this.cache.set(key, data, options.ttl, options.tags);
      return data;
    } catch (error) {
      this.logger.error(`Failed to warm cache for key ${key}:`, error);
      throw error;
    }
  }
  
  /**
   * Warm multiple cache entries
   */
  async warmBatch<T>(
    entries: Array<{
      key: string;
      fetcher: () => Promise<T>;
      options?: CacheStrategyOptions;
    }>
  ): Promise<T[]> {
    const results = await Promise.allSettled(
      entries.map(entry => this.warm(entry.key, entry.fetcher, entry.options))
    );
    
    const successful: T[] = [];
    const failed: string[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        failed.push(entries[index].key);
        this.logger.error(`Failed to warm cache for key ${entries[index].key}:`, result.reason);
      }
    });
    
    if (failed.length > 0) {
      this.logger.warn(`Failed to warm ${failed.length} cache entries:`, failed);
    }
    
    return successful;
  }
}

/**
 * Cache invalidation utility
 */
export class CacheInvalidator {
  private cache: CacheManager;
  private logger: Logger;
  
  constructor() {
    this.cache = CacheManager.getInstance();
    this.logger = new Logger('CacheInvalidator');
  }
  
  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const count = await this.cache.deleteByPattern(pattern);
      this.logger.debug(`Invalidated ${count} cache entries matching pattern: ${pattern}`);
      return count;
    } catch (error) {
      this.logger.error(`Failed to invalidate pattern ${pattern}:`, error);
      return 0;
    }
  }
  
  /**
   * Invalidate cache by tag
   */
  async invalidateTag(tag: string): Promise<number> {
    try {
      const count = await this.cache.deleteByTag(tag);
      this.logger.debug(`Invalidated ${count} cache entries with tag: ${tag}`);
      return count;
    } catch (error) {
      this.logger.error(`Failed to invalidate tag ${tag}:`, error);
      return 0;
    }
  }
  
  /**
   * Invalidate multiple tags
   */
  async invalidateTags(tags: string[]): Promise<number> {
    let totalCount = 0;
    
    for (const tag of tags) {
      totalCount += await this.invalidateTag(tag);
    }
    
    return totalCount;
  }
  
  /**
   * Invalidate user-specific cache
   */
  async invalidateUser(userId: string): Promise<number> {
    return await this.invalidatePattern(`user:${userId}:*`);
  }
  
  /**
   * Invalidate content cache
   */
  async invalidateContent(type: string, id?: string): Promise<number> {
    const pattern = id ? `${type}:${id}:*` : `${type}:*`;
    return await this.invalidatePattern(pattern);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<Partial<CacheStats>> {
  const cache = CacheManager.getInstance();
  
  try {
    // This would need to be implemented in the CacheManager
    // For now, return basic info
    return {
      size: 0, // Would need cache.size() method
      keys: [], // Would need cache.keys() method
    };
  } catch (error) {
    logger.error('Failed to get cache stats:', error);
    return {};
  }
}

/**
 * Batch cache operations
 */
export class CacheBatch {
  private operations: Array<() => Promise<void>> = [];
  private cache: CacheManager;
  
  constructor() {
    this.cache = CacheManager.getInstance();
  }
  
  /**
   * Add set operation to batch
   */
  set<T>(key: string, value: T, ttl?: number, tags?: string[]): this {
    this.operations.push(() => this.cache.set(key, value, ttl, tags));
    return this;
  }
  
  /**
   * Add delete operation to batch
   */
  delete(key: string): this {
    this.operations.push(() => this.cache.delete(key).then(() => {}));
    return this;
  }
  
  /**
   * Execute all operations in batch
   */
  async execute(): Promise<void> {
    await Promise.all(this.operations.map(op => op()));
    this.operations = [];
  }
  
  /**
   * Clear pending operations
   */
  clear(): void {
    this.operations = [];
  }
}

/**
 * Create cache warmer instance
 */
export function createCacheWarmer(): CacheWarmer {
  return new CacheWarmer();
}

/**
 * Create cache invalidator instance
 */
export function createCacheInvalidator(): CacheInvalidator {
  return new CacheInvalidator();
}

/**
 * Create cache batch instance
 */
export function createCacheBatch(): CacheBatch {
  return new CacheBatch();
}