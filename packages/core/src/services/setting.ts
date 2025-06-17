import { BaseService } from './base';
import { SettingModel, SettingDocument } from '../models/setting';
import { Setting } from '../types/system';
import { NotFoundError, ValidationError } from '../errors';
import { CACHE_KEYS, CACHE_TTL } from '../constants';
import { CacheManager } from '../utils/cache';

export class SettingService extends BaseService<SettingDocument> {
  private cache: CacheManager;

  constructor() {
    super(SettingModel, 'SettingService');
    this.cache = CacheManager.getInstance();
  }

  async createSetting(data: Partial<Setting>): Promise<SettingDocument> {
    const setting = await this.create(data);
    
    // Clear settings cache
    await this.cache.delete(CACHE_KEYS.SETTINGS);
    
    this.logger.info(`Created setting: ${setting.key}`);
    return setting;
  }

  async getSettingByKey(key: string): Promise<SettingDocument | null> {
    return await this.findOne({ key });
  }

  async getSettingValue<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    try {
      const setting = await this.getSettingByKey(key);
      return setting ? setting.value as T : defaultValue;
    } catch (error) {
      this.logger.error(`Failed to get setting value for key ${key}:`, error);
      return defaultValue;
    }
  }

  async setSettingValue(
    key: string, 
    value: any, 
    options?: {
      type?: string;
      group?: string;
      label?: string;
      description?: string;
      isPublic?: boolean;
      isAutoload?: boolean;
      validation?: any;
    }
  ): Promise<SettingDocument> {
    const existingSetting = await this.getSettingByKey(key);
    
    if (existingSetting) {
      const updated = await this.updateByIdOrThrow(existingSetting._id, {
        value,
        ...(options && options)
      });
      
      // Clear settings cache
      await this.cache.delete(CACHE_KEYS.SETTINGS);
      
      this.logger.info(`Updated setting: ${key}`);
      return updated;
    } else {
      if (!options?.type || !options?.group || !options?.label) {
        throw new ValidationError('Type, group, and label are required for new settings');
      }
      
      return await this.createSetting({
        key,
        value,
        ...options,
        type: options?.type as "string" | "number" | "boolean" | "object" | "array"
      });
    }
  }

  async getSettingsByGroup(group: string, publicOnly: boolean = false): Promise<SettingDocument[]> {
    const filter: any = { group };
    if (publicOnly) {
      filter.isPublic = true;
    }

    const result = await this.findMany(filter, { sort: 'label', order: 'asc' });
    return result.data;
  }

  async getAutoloadSettings(): Promise<Record<string, any>> {
    const cacheKey = `${CACHE_KEYS.SETTINGS}:autoload`;
    let settings = await this.cache.get<Record<string, any>>(cacheKey);

    if (!settings) {
      const result = await this.findMany({ isAutoload: true });
      settings = {};
      
      result.data.forEach(setting => {
        settings![setting.key] = setting.value;
      });
      
      await this.cache.set(cacheKey, settings, CACHE_TTL.VERY_LONG);
    }

    return settings;
  }

  async getPublicSettings(): Promise<Record<string, any>> {
    const cacheKey = `${CACHE_KEYS.SETTINGS}:public`;
    let settings = await this.cache.get<Record<string, any>>(cacheKey);

    if (!settings) {
      const result = await this.findMany({ isPublic: true });
      settings = {};
      
      result.data.forEach(setting => {
        settings![setting.key] = setting.value;
      });
      
      await this.cache.set(cacheKey, settings, CACHE_TTL.VERY_LONG);
    }

    return settings;
  }

  async getAllSettings(): Promise<Record<string, any>> {
    let settings = await this.cache.get<Record<string, any>>(CACHE_KEYS.SETTINGS);

    if (!settings) {
      const result = await this.findMany();
      settings = {};
      
      result.data.forEach(setting => {
        settings![setting.key] = setting.value;
      });
      
      await this.cache.set(CACHE_KEYS.SETTINGS, settings, CACHE_TTL.VERY_LONG);
    }

    return settings;
  }

  async getGroupValues(group: string): Promise<Record<string, any>> {
    const settings = await this.getSettingsByGroup(group);
    const result: Record<string, any> = {};
    
    settings.forEach(setting => {
      result[setting.key] = setting.value;
    });
    
    return result;
  }

  async bulkUpdateSettings(updates: Array<{ key: string; value: any }>): Promise<void> {
    const operations: Promise<SettingDocument | null>[] = [];
    
    for (const update of updates) {
      const existingSetting = await this.getSettingByKey(update.key);
      if (existingSetting) {
        operations.push(
          this.updateById(existingSetting._id, { value: update.value })
        );
      }
    }

    await Promise.all(operations);
    
    // Clear all settings cache
    await this.cache.deleteByPattern(`${CACHE_KEYS.SETTINGS}*`);
    
    this.logger.info(`Bulk updated ${updates.length} settings`);
  }

  async deleteSetting(key: string): Promise<void> {
    const setting = await this.getSettingByKey(key);
    if (!setting) {
      throw new NotFoundError(`Setting with key ${key}`);
    }

    await this.deleteByIdOrThrow(setting._id);
    
    // Clear settings cache
    await this.cache.deleteByPattern(`${CACHE_KEYS.SETTINGS}*`);
    
    this.logger.info(`Deleted setting: ${key}`);
  }

  async updateSetting(key: string, data: Partial<Setting>): Promise<SettingDocument> {
    const setting = await this.getSettingByKey(key);
    if (!setting) {
      throw new NotFoundError(`Setting with key ${key}`);
    }

    const updated = await this.updateByIdOrThrow(setting._id, data);
    
    // Clear settings cache
    await this.cache.deleteByPattern(`${CACHE_KEYS.SETTINGS}*`);
    
    this.logger.info(`Updated setting: ${key}`);
    return updated;
  }

  async getSettingGroups(): Promise<string[]> {
    const result = await this.model.distinct('group');
    return result.sort();
  }

  async exportSettings(group?: string): Promise<Setting[]> {
    const filter = group ? { group } : {};
    const result = await this.findMany(filter, { sort: 'group', order: 'asc' });
    
    return result.data.map(setting => ({
      key: setting.key,
      value: setting.value,
      type: setting.type,
      group: setting.group,
      label: setting.label,
      description: setting.description,
      isPublic: setting.isPublic,
      isAutoload: setting.isAutoload,
      validation: setting.validation,
      metadata: setting.metadata
    }) as Setting);
  }

  async importSettings(settings: Partial<Setting>[]): Promise<{ created: number; updated: number; errors: string[] }> {
    const result = { created: 0, updated: 0, errors: [] as string[] };

    for (const settingData of settings) {
      try {
        if (!settingData.key) {
          result.errors.push('Setting missing key');
          continue;
        }

        const existing = await this.getSettingByKey(settingData.key);
        
        if (existing) {
          await this.updateByIdOrThrow(existing._id, settingData);
          result.updated++;
        } else {
          await this.createSetting(settingData);
          result.created++;
        }
      } catch (error: any) {
        result.errors.push(`Error processing setting ${settingData.key}: ${error.message}`);
      }
    }

    // Clear all settings cache
    await this.cache.deleteByPattern(`${CACHE_KEYS.SETTINGS}*`);
    
    this.logger.info(`Imported settings: ${result.created} created, ${result.updated} updated, ${result.errors.length} errors`);
    return result;
  }

  async validateSetting(key: string, value: any): Promise<{ valid: boolean; errors: string[] }> {
    const setting = await this.getSettingByKey(key);
    if (!setting) {
      return { valid: false, errors: ['Setting not found'] };
    }

    const errors: string[] = [];

    try {
      // Create a temporary setting document to validate
      const tempSetting = new this.model({
        key: setting.key,
        value,
        type: setting.type,
        group: setting.group,
        label: setting.label,
        validation: setting.validation
      });

      await tempSetting.validate();
    } catch (error: any) {
      if (error.errors) {
        Object.values(error.errors).forEach((err: any) => {
          errors.push(err.message);
        });
      } else {
        errors.push(error.message);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // Initialize default settings
  async initializeDefaults(): Promise<void> {
  const defaultSettings = [
    {
      key: 'site_title',
      value: 'Vyral CMS',
      type: 'string' as const,
      group: 'general',
      label: 'Site Title',
      description: 'The title of your website',
      isPublic: true,
      isAutoload: true
    },
    {
      key: 'site_description',
      value: 'A modern, plugin-based content management system',
      type: 'string' as const,
      group: 'general',
      label: 'Site Description',
      description: 'A brief description of your website',
      isPublic: true,
      isAutoload: true
    },
    {
      key: 'posts_per_page',
      value: 10,
      type: 'number' as const,
      group: 'reading',
      label: 'Posts Per Page',
      description: 'Number of posts to show per page',
      isPublic: true,
      isAutoload: true,
      validation: { min: 1, max: 100 }
    },
    {
      key: 'comment_status',
      value: 'open',
      type: 'string' as const,
      group: 'discussion',
      label: 'Default Comment Status',
      description: 'Default comment status for new posts',
      isPublic: false,
      isAutoload: true,
      validation: { enum: ['open', 'closed'] }
    },
    {
      key: 'comment_moderation',
      value: true,
      type: 'boolean' as const,
      group: 'discussion',
      label: 'Comment Moderation',
      description: 'Require approval for comments',
      isPublic: false,
      isAutoload: true
    }
  ];

  for (const setting of defaultSettings) {
    const existing = await this.getSettingByKey(setting.key);
    if (!existing) {
      await this.createSetting(setting);
    }
  }

  this.logger.info('Default settings initialized');
}
}