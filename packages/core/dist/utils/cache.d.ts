export interface CacheOptions {
    ttl?: number;
    tags?: string[];
}
export declare class CacheManager {
    private static instance;
    private cache;
    private logger;
    private constructor();
    static getInstance(): CacheManager;
    set(key: string, value: any, ttl?: number, tags?: string[]): Promise<void>;
    get<T>(key: string): Promise<T | null>;
    delete(key: string): Promise<boolean>;
    deleteByPattern(pattern: string): Promise<number>;
    deleteByTag(tag: string): Promise<number>;
    clear(): Promise<void>;
    has(key: string): Promise<boolean>;
    getStats(): {
        size: number;
        keys: string[];
    };
    private cleanup;
    startCleanup(intervalMs?: number): void;
}
//# sourceMappingURL=cache.d.ts.map