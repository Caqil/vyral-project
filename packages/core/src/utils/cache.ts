import { Logger } from "./logger";

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, { value: any; expires: number; tags: string[] }>;
  private logger: Logger;

  private constructor() {
    this.cache = new Map();
    this.logger = new Logger('CacheManager');
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  async set(key: string, value: any, ttl: number = 3600, tags: string[] = []): Promise<void> {
    const expires = Date.now() + (ttl * 1000);
    this.cache.set(key, { value, expires, tags });
    this.logger.debug(`Cache set: ${key}`, { ttl, tags });
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      this.logger.debug(`Cache expired: ${key}`);
      return null;
    }

    this.logger.debug(`Cache hit: ${key}`);
    return item.value as T;
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger.debug(`Cache deleted: ${key}`);
    }
    return deleted;
  }

  async deleteByPattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    let count = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    this.logger.debug(`Cache deleted by pattern: ${pattern}`, { count });
    return count;
  }

  async deleteByTag(tag: string): Promise<number> {
    let count = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.tags.includes(tag)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    this.logger.debug(`Cache deleted by tag: ${tag}`, { count });
    return count;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.logger.info('Cache cleared');
  }

  async has(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Cleanup expired entries
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.debug(`Cache cleanup completed`, { cleaned });
    }
  }

  // Start periodic cleanup
  startCleanup(intervalMs: number = 300000): void { // 5 minutes
    setInterval(() => this.cleanup(), intervalMs);
    this.logger.info('Cache cleanup started', { intervalMs });
  }
}