import { Schema, model, models } from 'mongoose';
import { Setting } from '../types/system';
import { createBaseSchema, BaseDocument } from './base';

export interface SettingDocument extends BaseDocument, Omit<Setting, '_id'> {}

const SettingSchema = createBaseSchema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100,
    match: /^[a-zA-Z0-9_.-]+$/
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  },
  type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    required: true,
    default: 'string'
  },
  group: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
    index: true,
    default: 'general'
  },
  label: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  isPublic: {
    type: Boolean,
    default: false,
    index: true
  },
  isAutoload: {
    type: Boolean,
    default: false,
    index: true
  },
  validation: {
    type: Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
});

// Indexes
SettingSchema.index({ key: 1 });
SettingSchema.index({ group: 1, isAutoload: 1 });
SettingSchema.index({ isPublic: 1 });
SettingSchema.index({ label: 'text', description: 'text' });

// Virtual for serialized value (for complex types)
SettingSchema.virtual('serializedValue').get(function() {
  if (this.type === 'object' || this.type === 'array') {
    return JSON.stringify(this.value);
  }
  return this.value?.toString() || '';
});

// Pre-save middleware to validate and type-cast value
SettingSchema.pre('save', function(next) {
  try {
    // Type validation and casting
    switch (this.type) {
      case 'string':
        this.value = String(this.value || '');
        break;
      
      case 'number':
        const numValue = Number(this.value);
        if (isNaN(numValue)) {
          throw new Error(`Invalid number value for setting "${this.key}"`);
        }
        this.value = numValue;
        break;
      
      case 'boolean':
        if (typeof this.value === 'string') {
          this.value = this.value.toLowerCase() === 'true' || this.value === '1';
        } else {
          this.value = Boolean(this.value);
        }
        break;
      
      case 'object':
        if (typeof this.value === 'string') {
          try {
            this.value = JSON.parse(this.value);
          } catch (e) {
            throw new Error(`Invalid JSON object for setting "${this.key}"`);
          }
        }
        if (typeof this.value !== 'object' || Array.isArray(this.value)) {
          throw new Error(`Setting "${this.key}" must be an object`);
        }
        break;
      
      case 'array':
        if (typeof this.value === 'string') {
          try {
            this.value = JSON.parse(this.value);
          } catch (e) {
            throw new Error(`Invalid JSON array for setting "${this.key}"`);
          }
        }
        if (!Array.isArray(this.value)) {
          throw new Error(`Setting "${this.key}" must be an array`);
        }
        break;
    }

    // Apply validation rules if they exist
    if (this.validation) {
      if (this.validation.required && (this.value === null || this.value === undefined || this.value === '')) {
        throw new Error(`Setting "${this.key}" is required`);
      }

      if (this.type === 'string' && this.validation.minLength && this.value.length < this.validation.minLength) {
        throw new Error(`Setting "${this.key}" must be at least ${this.validation.minLength} characters`);
      }

      if (this.type === 'string' && this.validation.maxLength && this.value.length > this.validation.maxLength) {
        throw new Error(`Setting "${this.key}" must be no more than ${this.validation.maxLength} characters`);
      }

      if (this.type === 'number' && this.validation.min !== undefined && this.value < this.validation.min) {
        throw new Error(`Setting "${this.key}" must be at least ${this.validation.min}`);
      }

      if (this.type === 'number' && this.validation.max !== undefined && this.value > this.validation.max) {
        throw new Error(`Setting "${this.key}" must be no more than ${this.validation.max}`);
      }

      if (this.validation.pattern && !new RegExp(this.validation.pattern).test(this.value)) {
        throw new Error(`Setting "${this.key}" does not match required pattern`);
      }

      if (this.validation.enum && !this.validation.enum.includes(this.value)) {
        throw new Error(`Setting "${this.key}" must be one of: ${this.validation.enum.join(', ')}`);
      }
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// Static method to get setting value by key
SettingSchema.statics.getValue = async function(key: string, defaultValue?: any) {
  try {
    const setting = await this.findOne({ key }).lean();
    return setting ? setting.value : defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

// Static method to set setting value
SettingSchema.statics.setValue = async function(key: string, value: any, options?: {
  type?: string;
  group?: string;
  label?: string;
  description?: string;
  isPublic?: boolean;
  isAutoload?: boolean;
  validation?: any;
}) {
  const updateData: any = { value };
  
  if (options) {
    Object.assign(updateData, options);
  }

  return this.findOneAndUpdate(
    { key },
    updateData,
    { 
      new: true, 
      upsert: true, 
      runValidators: true,
      setDefaultsOnInsert: true
    }
  );
};

// Static method to get all settings by group
SettingSchema.statics.getByGroup = async function(group: string, publicOnly: boolean = false) {
  const filter: any = { group };
  if (publicOnly) {
    filter.isPublic = true;
  }

  return this.find(filter).sort({ label: 1 }).lean();
};

// Static method to get autoload settings
SettingSchema.statics.getAutoloadSettings = async function() {
  const settings = await this.find({ isAutoload: true }).lean();
  const result: Record<string, any> = {};
  
  settings.forEach(setting => {
    result[setting.key] = setting.value;
  });
  
  return result;
};

// Static method to get public settings (for frontend)
SettingSchema.statics.getPublicSettings = async function() {
  const settings = await this.find({ isPublic: true }).lean();
  const result: Record<string, any> = {};
  
  settings.forEach(setting => {
    result[setting.key] = setting.value;
  });
  
  return result;
};

// Static method to get settings for a group as key-value pairs
SettingSchema.statics.getGroupValues = async function(group: string) {
  const settings = await this.find({ group }).lean();
  const result: Record<string, any> = {};
  
  settings.forEach(setting => {
    result[setting.key] = setting.value;
  });
  
  return result;
};

// Static method to bulk update settings
SettingSchema.statics.bulkUpdate = async function(updates: Array<{ key: string; value: any }>) {
  const operations = updates.map(update => ({
    updateOne: {
      filter: { key: update.key },
      update: { value: update.value },
      upsert: false
    }
  }));

  return this.bulkWrite(operations);
};

// Static method to delete setting
SettingSchema.statics.deleteSetting = async function(key: string) {
  return this.findOneAndDelete({ key });
};

export const SettingModel = models.Setting || model<SettingDocument>('Setting', SettingSchema);