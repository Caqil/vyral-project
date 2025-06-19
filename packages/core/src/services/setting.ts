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
      value: 'A modern CMS built with Next.js',
      type: 'string' as const,
      group: 'general',
      label: 'Site Description',
      description: 'Brief description of your website',
      isPublic: true,
      isAutoload: true
    },
    {
      key: 'site_url',
      value: 'http://localhost:3000',
      type: 'string' as const,
      group: 'general',
      label: 'Site URL',
      description: 'The URL of your website',
      isPublic: true,
      isAutoload: true
    },
    {
      key: 'admin_email',
      value: 'admin@vyral.com',
      type: 'string' as const,
      group: 'general',
      label: 'Admin Email',
      description: 'Primary admin email address',
      isPublic: false,
      isAutoload: true
    },
    {
      key: 'posts_per_page',
      value: 10,
      type: 'number' as const,
      group: 'content',
      label: 'Posts Per Page',
      description: 'Number of posts to display per page',
      isPublic: false,
      isAutoload: true
    },
    {
      key: 'allow_comments',
      value: true,
      type: 'boolean' as const,
      group: 'content',
      label: 'Allow Comments',
      description: 'Enable comments on posts',
      isPublic: false,
      isAutoload: true
    },
    {
      key: 'comment_moderation',
      value: true,
      type: 'boolean' as const,
      group: 'content',
      label: 'Comment Moderation',
      description: 'Require admin approval for comments',
      isPublic: false,
      isAutoload: true
    },
    {
      key: 'default_post_status',
      value: 'draft',
      type: 'string' as const,
      group: 'content',
      label: 'Default Post Status',
      description: 'Default status for new posts',
      isPublic: false,
      isAutoload: true,
      validation: {
        enum: ['draft', 'published', 'private']
      }
    },
    {
      key: 'enable_registration',
      value: false,
      type: 'boolean' as const,
      group: 'users',
      label: 'Enable Registration',
      description: 'Allow new user registration',
      isPublic: false,
      isAutoload: true
    },
    {
      key: 'default_user_role',
      value: 'subscriber',
      type: 'string' as const,
      group: 'users',
      label: 'Default User Role',
      description: 'Default role for new users',
      isPublic: false,
      isAutoload: true,
      validation: {
        enum: ['subscriber', 'contributor', 'author', 'editor']
      }
    },
    {
      key: 'date_format',
      value: 'MMMM d, yyyy',
      type: 'string' as const,
      group: 'general',
      label: 'Date Format',
      description: 'Display format for dates',
      isPublic: true,
      isAutoload: true
    },
    {
      key: 'time_format',
      value: 'h:mm a',
      type: 'string' as const,
      group: 'general',
      label: 'Time Format',
      description: 'Display format for times',
      isPublic: true,
      isAutoload: true
    },
    {
      key: 'timezone',
      value: 'UTC',
      type: 'string' as const,
      group: 'general',
      label: 'Timezone',
      description: 'Site timezone',
      isPublic: false,
      isAutoload: true
    },
    {
      key: 'language',
      value: 'en',
      type: 'string' as const,
      group: 'general',
      label: 'Language',
      description: 'Site language',
      isPublic: true,
      isAutoload: true
    },
    {
      key: 'theme',
      value: 'default',
      type: 'string' as const,
      group: 'appearance',
      label: 'Theme',
      description: 'Active theme',
      isPublic: true,
      isAutoload: true
    },
    {
      key: 'logo',
      value: '',
      type: 'string' as const,
      group: 'appearance',
      label: 'Logo',
      description: 'Site logo URL',
      isPublic: true,
      isAutoload: true
    },
    {
      key: 'favicon',
      value: '/favicon.ico',
      type: 'string' as const,
      group: 'appearance',
      label: 'Favicon',
      description: 'Site favicon URL',
      isPublic: true,
      isAutoload: true
    },
    {
      key: 'seo_title',
      value: 'Vyral CMS',
      type: 'string' as const,
      group: 'seo',
      label: 'SEO Title',
      description: 'Default SEO title',
      isPublic: true,
      isAutoload: true
    },
    {
      key: 'seo_description',
      value: 'A modern content management system built with Next.js',
      type: 'string' as const,
      group: 'seo',
      label: 'SEO Description',
      description: 'Default SEO description',
      isPublic: true,
      isAutoload: true
    },
    {
      key: 'google_analytics',
      value: '',
      type: 'string' as const,
      group: 'analytics',
      label: 'Google Analytics ID',
      description: 'Google Analytics tracking ID',
      isPublic: false,
      isAutoload: true
    },
    {
      key: 'facebook_pixel',
      value: '',
      type: 'string' as const,
      group: 'analytics',
      label: 'Facebook Pixel ID',
      description: 'Facebook Pixel tracking ID',
      isPublic: false,
      isAutoload: true
    },
    {
      key: 'maintenance_mode',
      value: false,
      type: 'boolean' as const,
      group: 'system',
      label: 'Maintenance Mode',
      description: 'Enable maintenance mode',
      isPublic: false,
      isAutoload: true
    },
    {
      key: 'maintenance_message',
      value: 'Site is under maintenance. Please check back later.',
      type: 'string' as const,
      group: 'system',
      label: 'Maintenance Message',
      description: 'Message shown during maintenance',
      isPublic: false,
      isAutoload: true
    }
  ];

  let created = 0;
  let skipped = 0;

  for (const setting of defaultSettings) {
    try {
      const existing = await this.getSettingByKey(setting.key);
      
      if (!existing) {
        await this.setSettingValue(
          setting.key,
          setting.value,
          {
            type: setting.type,
            group: setting.group,
            label: setting.label,
            description: setting.description,
            isPublic: setting.isPublic,
            isAutoload: setting.isAutoload,
            validation: setting.validation || {}
          }
        );
        created++;
        this.logger.debug(`Created default setting: ${setting.key}`);
      } else {
        skipped++;
        this.logger.debug(`Setting already exists: ${setting.key}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to create setting ${setting.key}:`, error);
    }
  }

  this.logger.info(`Initialized default settings: ${created} created, ${skipped} skipped`);
}
}