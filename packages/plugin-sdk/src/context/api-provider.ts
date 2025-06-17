import { PluginAPI, PluginInstance } from '../types/plugin';
import { Logger } from '../utils/logger';

export class APIProvider implements PluginAPI {
  private logger: Logger;
  private pluginId: string;
  private services: Map<string, any> = new Map();
  private database: any;
  private pluginInstances: Map<string, PluginInstance>;

  constructor(pluginId: string, database: any, pluginInstances: Map<string, PluginInstance>) {
    this.pluginId = pluginId;
    this.database = database;
    this.pluginInstances = pluginInstances;
    this.logger = new Logger(`APIProvider:${pluginId}`);
    this.initializeServices();
  }

  private initializeServices(): void {
    // Initialize core services
    this.services.set('post', this.createPostService());
    this.services.set('user', this.createUserService());
    this.services.set('category', this.createCategoryService());
    this.services.set('tag', this.createTagService());
    this.services.set('media', this.createMediaService());
    this.services.set('comment', this.createCommentService());
    this.services.set('setting', this.createSettingService());
  }

  // Core service getters
  public getPostService(): any {
    return this.services.get('post');
  }

  public getUserService(): any {
    return this.services.get('user');
  }

  public getCategoryService(): any {
    return this.services.get('category');
  }

  public getTagService(): any {
    return this.services.get('tag');
  }

  public getMediaService(): any {
    return this.services.get('media');
  }

  public getCommentService(): any {
    return this.services.get('comment');
  }

  public getSettingService(): any {
    return this.services.get('setting');
  }

  // Plugin management
  public getPlugin(id: string): PluginInstance | null {
    return this.pluginInstances.get(id) || null;
  }

  public isPluginActive(id: string): boolean {
    const plugin = this.pluginInstances.get(id);
    return plugin?.status === 'activated' || false;
  }

  public async getPluginSetting(key: string, defaultValue?: any): Promise<any> {
    try {
      const collection = this.database.collection('plugin_settings');
      const setting = await collection.findOne({
        pluginId: this.pluginId,
        key: key
      });
      return setting?.value ?? defaultValue;
    } catch (error) {
      this.logger.error(`Error getting plugin setting ${key}:`, error);
      return defaultValue;
    }
  }

  public async setPluginSetting(key: string, value: any): Promise<void> {
    try {
      const collection = this.database.collection('plugin_settings');
      await collection.updateOne(
        { pluginId: this.pluginId, key: key },
        { $set: { value: value, updatedAt: new Date() } },
        { upsert: true }
      );
      this.logger.debug(`Plugin setting ${key} updated`);
    } catch (error) {
      this.logger.error(`Error setting plugin setting ${key}:`, error);
      throw error;
    }
  }

  // Database access
  public getDatabase(): any {
    return this.database;
  }

  public async query(collection: string, filter?: any, options?: any): Promise<any> {
    try {
      const coll = this.database.collection(collection);
      
      if (options?.limit) {
        return await coll.find(filter || {}).limit(options.limit).toArray();
      }
      
      if (options?.sort) {
        return await coll.find(filter || {}).sort(options.sort).toArray();
      }

      return await coll.find(filter || {}).toArray();
    } catch (error) {
      this.logger.error(`Error querying collection ${collection}:`, error);
      throw error;
    }
  }

  // HTTP client
  public async request(url: string, options?: RequestInit): Promise<Response> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': `Vyral-Plugin/${this.pluginId}`,
          ...options?.headers
        }
      });
      
      this.logger.debug(`HTTP request to ${url}: ${response.status}`);
      return response;
    } catch (error) {
      this.logger.error(`HTTP request error to ${url}:`, error);
      throw error;
    }
  }

  // File system operations (server-side only)
  public async readFile(path: string): Promise<string> {
    if (typeof window !== 'undefined') {
      throw new Error('File system operations not available in browser');
    }
    
    try {
      const fs = await import('fs/promises');
      return await fs.readFile(path, 'utf-8');
    } catch (error) {
      this.logger.error(`Error reading file ${path}:`, error);
      throw error;
    }
  }

  public async writeFile(path: string, content: string): Promise<void> {
    if (typeof window !== 'undefined') {
      throw new Error('File system operations not available in browser');
    }
    
    try {
      const fs = await import('fs/promises');
      await fs.writeFile(path, content, 'utf-8');
      this.logger.debug(`File written: ${path}`);
    } catch (error) {
      this.logger.error(`Error writing file ${path}:`, error);
      throw error;
    }
  }

  public async deleteFile(path: string): Promise<void> {
    if (typeof window !== 'undefined') {
      throw new Error('File system operations not available in browser');
    }
    
    try {
      const fs = await import('fs/promises');
      await fs.unlink(path);
      this.logger.debug(`File deleted: ${path}`);
    } catch (error) {
      this.logger.error(`Error deleting file ${path}:`, error);
      throw error;
    }
  }

  // Cache implementation
  public cache = {
    get: async <T>(key: string): Promise<T | null> => {
      try {
        const collection = this.database.collection('plugin_cache');
        const cached = await collection.findOne({
          pluginId: this.pluginId,
          key: key
        });

        if (!cached) return null;

        // Check if expired
        if (cached.expiresAt && cached.expiresAt < new Date()) {
          await this.cache.delete(key);
          return null;
        }

        return cached.value;
      } catch (error) {
        this.logger.error(`Error getting cache ${key}:`, error);
        return null;
      }
    },

    set: async <T>(key: string, value: T, ttl?: number): Promise<void> => {
      try {
        const collection = this.database.collection('plugin_cache');
        const doc: any = {
          pluginId: this.pluginId,
          key: key,
          value: value,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        if (ttl) {
          doc.expiresAt = new Date(Date.now() + ttl * 1000);
        }

        await collection.updateOne(
          { pluginId: this.pluginId, key: key },
          { $set: doc },
          { upsert: true }
        );
      } catch (error) {
        this.logger.error(`Error setting cache ${key}:`, error);
        throw error;
      }
    },

    delete: async (key: string): Promise<void> => {
      try {
        const collection = this.database.collection('plugin_cache');
        await collection.deleteOne({
          pluginId: this.pluginId,
          key: key
        });
      } catch (error) {
        this.logger.error(`Error deleting cache ${key}:`, error);
        throw error;
      }
    },

    clear: async (): Promise<void> => {
      try {
        const collection = this.database.collection('plugin_cache');
        await collection.deleteMany({ pluginId: this.pluginId });
        this.logger.debug('Plugin cache cleared');
      } catch (error) {
        this.logger.error('Error clearing cache:', error);
        throw error;
      }
    }
  };

  // Service factory methods
  private createPostService() {
    return {
      findById: async (id: string) => {
        return await this.query('posts', { _id: id });
      },
      findBySlug: async (slug: string) => {
        return await this.query('posts', { slug: slug });
      },
      findPublished: async (options?: any) => {
        return await this.query('posts', { status: 'published' }, options);
      },
      create: async (data: any) => {
        const collection = this.database.collection('posts');
        return await collection.insertOne(data);
      },
      update: async (id: string, data: any) => {
        const collection = this.database.collection('posts');
        return await collection.updateOne({ _id: id }, { $set: data });
      },
      delete: async (id: string) => {
        const collection = this.database.collection('posts');
        return await collection.deleteOne({ _id: id });
      }
    };
  }

  private createUserService() {
    return {
      findById: async (id: string) => {
        return await this.query('users', { _id: id });
      },
      findByEmail: async (email: string) => {
        return await this.query('users', { email: email });
      },
      findActive: async (options?: any) => {
        return await this.query('users', { active: true }, options);
      },
      create: async (data: any) => {
        const collection = this.database.collection('users');
        return await collection.insertOne(data);
      },
      update: async (id: string, data: any) => {
        const collection = this.database.collection('users');
        return await collection.updateOne({ _id: id }, { $set: data });
      }
    };
  }

  private createCategoryService() {
    return {
      findAll: async () => {
        return await this.query('categories', {});
      },
      findBySlug: async (slug: string) => {
        return await this.query('categories', { slug: slug });
      },
      create: async (data: any) => {
        const collection = this.database.collection('categories');
        return await collection.insertOne(data);
      },
      update: async (id: string, data: any) => {
        const collection = this.database.collection('categories');
        return await collection.updateOne({ _id: id }, { $set: data });
      }
    };
  }

  private createTagService() {
    return {
      findAll: async () => {
        return await this.query('tags', {});
      },
      findByName: async (name: string) => {
        return await this.query('tags', { name: name });
      },
      create: async (data: any) => {
        const collection = this.database.collection('tags');
        return await collection.insertOne(data);
      }
    };
  }

  private createMediaService() {
    return {
      findById: async (id: string) => {
        return await this.query('media', { _id: id });
      },
      findByType: async (type: string) => {
        return await this.query('media', { type: type });
      },
      upload: async (file: any, metadata: any) => {
        // Implementation would depend on your file upload system
        throw new Error('Media upload not implemented');
      }
    };
  }

  private createCommentService() {
    return {
      findByPost: async (postId: string) => {
        return await this.query('comments', { postId: postId });
      },
      findApproved: async (postId: string) => {
        return await this.query('comments', { postId: postId, approved: true });
      },
      create: async (data: any) => {
        const collection = this.database.collection('comments');
        return await collection.insertOne(data);
      },
      approve: async (id: string) => {
        const collection = this.database.collection('comments');
        return await collection.updateOne({ _id: id }, { $set: { approved: true } });
      }
    };
  }

  private createSettingService() {
    return {
      get: async (key: string, defaultValue?: any) => {
        const setting = await this.query('settings', { key: key });
        return setting[0]?.value ?? defaultValue;
      },
      set: async (key: string, value: any) => {
        const collection = this.database.collection('settings');
        return await collection.updateOne(
          { key: key },
          { $set: { value: value, updatedAt: new Date() } },
          { upsert: true }
        );
      },
      getMultiple: async (keys: string[]) => {
        const settings = await this.query('settings', { key: { $in: keys } });
        return settings.reduce((acc: any, setting: any) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {});
      }
    };
  }
}