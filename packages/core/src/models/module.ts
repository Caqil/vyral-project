import { Schema, model, models, Document } from 'mongoose';
import { Module } from '../types/module';
import path from 'path';

export interface ModuleDocument extends Omit<Module, '_id'>, Document {}

const ModuleSchema = new Schema<ModuleDocument>({
  manifest: {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    version: { type: String, required: true },
    description: { type: String, required: true },
    author: { type: String, required: true },
    email: String,
    website: String,
    license: { type: String, required: true },
    
    compatibility: {
      vyralVersion: { type: String, required: true },
      nodeVersion: { type: String, required: true }
    },
    
    dependencies: { type: Map, of: String },
    peerDependencies: { type: Map, of: String },
    
    category: {
      type: String,
      enum: ['social', 'ecommerce', 'seo', 'analytics', 'content', 'utility', 'security'],
      required: true
    },
    tags: [String],
    
    icon: String,
    screenshots: [String],
    
    features: [{
      name: { type: String, required: true },
      description: { type: String, required: true },
      enabled: { type: Boolean, default: true },
      required: { type: Boolean, default: false },
      config: { type: Schema.Types.Mixed }
    }],
    
    permissions: [String],
    
    apiRoutes: [{
      method: { 
        type: String, 
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        required: true 
      },
      path: { type: String, required: true },
      handler: { type: String, required: true },
      middleware: [String],
      permissions: [String],
      description: String
    }],
    
    dbMigrations: [String],
    
    hooks: [{
      event: { type: String, required: true },
      handler: { type: String, required: true },
      priority: { type: Number, default: 10 },
      async: { type: Boolean, default: true }
    }],
    
    requirements: {
      plugins: [String],
      modules: [String],
      services: [String],
      memory: String,
      storage: String
    },
    
    settings: [{
      key: { type: String, required: true },
      type: { 
        type: String, 
        enum: ['string', 'number', 'boolean', 'select', 'multiselect', 'textarea', 'file', 'json'],
        required: true 
      },
      label: { type: String, required: true },
      description: String,
      default: Schema.Types.Mixed,
      required: { type: Boolean, default: false },
      options: [{ label: String, value: Schema.Types.Mixed }],
      validation: {
        min: Number,
        max: Number,
        pattern: String,
        minLength: Number,
        maxLength: Number
      },
      group: String,
      dependsOn: String
    }],
    
    defaultConfig: { type: Schema.Types.Mixed },
    main: { type: String, required: true },
    uninstallScript: String,
    
    price: Number,
    purchaseUrl: String,
    supportUrl: String,
    documentationUrl: String
  },
  
  status: {
    type: String,
    enum: ['installing', 'installed', 'active', 'inactive', 'error', 'updating'],
    default: 'installing'
  },
  
  installPath: { type: String, required: true },
  configValues: { type: Schema.Types.Mixed, default: {} },
  
  installedAt: { type: Date, default: Date.now },
  installedBy: { type: String, ref: 'User', required: true },
  activatedAt: Date,
  
  lastError: String,
  errorCount: { type: Number, default: 0 },
  
  updateAvailable: String,
  lastCheckedForUpdates: Date,
  
  usageStats: {
    apiCalls: { type: Number, default: 0 },
    lastUsed: Date,
    activeUsers: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes
ModuleSchema.index({ 'manifest.slug': 1 });
ModuleSchema.index({ 'manifest.category': 1 });
ModuleSchema.index({ status: 1 });
ModuleSchema.index({ installedBy: 1 });

// Virtual for module instance path
ModuleSchema.virtual('instancePath').get(function() {
  return path.join(this.installPath, this.manifest.main);
});

// Methods
ModuleSchema.methods.isActive = function(): boolean {
  return this.status === 'active';
};

ModuleSchema.methods.canActivate = function(): boolean {
  return ['installed', 'inactive'].includes(this.status);
};

ModuleSchema.methods.canDeactivate = function(): boolean {
  return this.status === 'active';
};

ModuleSchema.methods.getConfigValue = function(key: string, defaultValue?: any): any {
  return this.configValues[key] ?? this.manifest.defaultConfig?.[key] ?? defaultValue;
};

// Static methods
ModuleSchema.statics.findBySlug = function(slug: string) {
  return this.findOne({ 'manifest.slug': slug });
};

ModuleSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

ModuleSchema.statics.findByCategory = function(category: string) {
  return this.find({ 'manifest.category': category });
};

export const ModuleModel = models.Module || model<ModuleDocument>('Module', ModuleSchema);