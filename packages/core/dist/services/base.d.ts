import { Document, Model, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';
import { PaginationParams, PaginationResult } from '../types/api';
import { Logger } from '../utils/logger';
export declare abstract class BaseService<T extends Document> {
    protected model: Model<T>;
    protected logger: Logger;
    constructor(model: Model<T>, serviceName: string);
    create(data: Partial<T>): Promise<T>;
    findById(id: string, options?: QueryOptions): Promise<T | null>;
    findByIdOrThrow(id: string, options?: QueryOptions): Promise<T>;
    findOne(filter: FilterQuery<T>, options?: QueryOptions): Promise<T | null>;
    findMany(filter?: FilterQuery<T>, pagination?: PaginationParams, options?: QueryOptions): Promise<PaginationResult<T>>;
    updateById(id: string, update: UpdateQuery<T>, options?: QueryOptions): Promise<T | null>;
    updateByIdOrThrow(id: string, update: UpdateQuery<T>, options?: QueryOptions): Promise<T>;
    deleteById(id: string): Promise<boolean>;
    deleteByIdOrThrow(id: string): Promise<void>;
    count(filter?: FilterQuery<T>): Promise<number>;
    exists(filter: FilterQuery<T>): Promise<boolean>;
}
//# sourceMappingURL=base.d.ts.map