import { Logger } from "./logger";
export class CacheManager {
    static instance;
    cache;
    logger;
    constructor() {
        this.cache = new Map();
        this.logger = new Logger('CacheManager');
    }
    static getInstance() {
        if (!CacheManager.instance) {
            CacheManager.instance = new CacheManager();
        }
        return CacheManager.instance;
    }
    async set(key, value, ttl = 3600, tags = []) {
        const expires = Date.now() + (ttl * 1000);
        this.cache.set(key, { value, expires, tags });
        this.logger.debug(`Cache set: ${key}`, { ttl, tags });
    }
    async get(key) {
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
        return item.value;
    }
    async delete(key) {
        const deleted = this.cache.delete(key);
        if (deleted) {
            this.logger.debug(`Cache deleted: ${key}`);
        }
        return deleted;
    }
    async deleteByPattern(pattern) {
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
    async deleteByTag(tag) {
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
    async clear() {
        this.cache.clear();
        this.logger.info('Cache cleared');
    }
    async has(key) {
        const item = this.cache.get(key);
        if (!item)
            return false;
        if (Date.now() > item.expires) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
    // Cleanup expired entries
    cleanup() {
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
    startCleanup(intervalMs = 300000) {
        setInterval(() => this.cleanup(), intervalMs);
        this.logger.info('Cache cleanup started', { intervalMs });
    }
}
//# sourceMappingURL=cache.js.map