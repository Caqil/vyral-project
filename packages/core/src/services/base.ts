import { Document, Model, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';
import { PaginationParams, PaginationResult, FilterParams } from '../types/api';
import { DEFAULT_PAGINATION } from '../constants';
import { NotFoundError, ValidationError } from '../errors';
import { Logger } from '../utils/logger';

export abstract class BaseService<T extends Document> {
  protected model: Model<T>;
  protected logger: Logger;

  constructor(model: Model<T>, serviceName: string) {
    this.model = model;
    this.logger = new Logger(serviceName);
  }

  async create(data: Partial<T>): Promise<T> {
    try {
      const document = new this.model(data);
      await document.save();
      this.logger.info(`Created ${this.model.modelName} with ID: ${document._id}`);
      return document;
    } catch (error: any) {
      this.logger.error(`Failed to create ${this.model.modelName}:`, error);
      if (error.name === 'ValidationError') {
        throw new ValidationError(error.message, error.errors);
      }
      throw error;
    }
  }

  async findById(id: string, options?: QueryOptions): Promise<T | null> {
    try {
      const document = await this.model.findById(id, null, options);
      return document;
    } catch (error: any) {
      this.logger.error(`Failed to find ${this.model.modelName} by ID ${id}:`, error);
      throw error;
    }
  }

  async findByIdOrThrow(id: string, options?: QueryOptions): Promise<T> {
    const document = await this.findById(id, options);
    if (!document) {
      throw new NotFoundError(`${this.model.modelName} with ID ${id}`);
    }
    return document;
  }

  async findOne(filter: FilterQuery<T>, options?: QueryOptions): Promise<T | null> {
    try {
      return await this.model.findOne(filter, null, options);
    } catch (error: any) {
      this.logger.error(`Failed to find ${this.model.modelName}:`, error);
      throw error;
    }
  }

  async findMany(
    filter: FilterQuery<T> = {},
    pagination?: PaginationParams,
    options?: QueryOptions
  ): Promise<PaginationResult<T>> {
    try {
      const page = Math.max(1, pagination?.page || DEFAULT_PAGINATION.page);
      const limit = Math.min(
        pagination?.limit || DEFAULT_PAGINATION.limit,
        DEFAULT_PAGINATION.maxLimit
      );
      const skip = (page - 1) * limit;

      // Build sort object
      const sort: any = {};
      if (pagination?.sort) {
        sort[pagination.sort] = pagination.order === 'desc' ? -1 : 1;
      } else {
        sort.createdAt = -1; // Default sort by creation date
      }

      const [data, total] = await Promise.all([
        this.model.find(filter, null, { ...options, skip, limit, sort }),
        this.model.countDocuments(filter)
      ]);

      const pages = Math.ceil(total / limit);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1
        }
      };
    } catch (error: any) {
      this.logger.error(`Failed to find ${this.model.modelName} documents:`, error);
      throw error;
    }
  }

  async updateById(id: string, update: UpdateQuery<T>, options?: QueryOptions): Promise<T | null> {
    try {
      const document = await this.model.findByIdAndUpdate(
        id,
        { ...update, updatedAt: new Date() },
        { new: true, runValidators: true, ...options }
      );
      
      if (document) {
        this.logger.info(`Updated ${this.model.modelName} with ID: ${id}`);
      }
      
      return document;
    } catch (error: any) {
      this.logger.error(`Failed to update ${this.model.modelName} with ID ${id}:`, error);
      if (error.name === 'ValidationError') {
        throw new ValidationError(error.message, error.errors);
      }
      throw error;
    }
  }

  async updateByIdOrThrow(id: string, update: UpdateQuery<T>, options?: QueryOptions): Promise<T> {
    const document = await this.updateById(id, update, options);
    if (!document) {
      throw new NotFoundError(`${this.model.modelName} with ID ${id}`);
    }
    return document;
  }

  async deleteById(id: string): Promise<boolean> {
    try {
      const result = await this.model.findByIdAndDelete(id);
      if (result) {
        this.logger.info(`Deleted ${this.model.modelName} with ID: ${id}`);
        return true;
      }
      return false;
    } catch (error: any) {
      this.logger.error(`Failed to delete ${this.model.modelName} with ID ${id}:`, error);
      throw error;
    }
  }

  async deleteByIdOrThrow(id: string): Promise<void> {
    const deleted = await this.deleteById(id);
    if (!deleted) {
      throw new NotFoundError(`${this.model.modelName} with ID ${id}`);
    }
  }

  async count(filter: FilterQuery<T> = {}): Promise<number> {
    try {
      return await this.model.countDocuments(filter);
    } catch (error: any) {
      this.logger.error(`Failed to count ${this.model.modelName} documents:`, error);
      throw error;
    }
  }

  async exists(filter: FilterQuery<T>): Promise<boolean> {
    try {
      const document = await this.model.exists(filter);
      return !!document;
    } catch (error: any) {
      this.logger.error(`Failed to check if ${this.model.modelName} exists:`, error);
      throw error;
    }
  }
}