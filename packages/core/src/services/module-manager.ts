// Fixed Module Manager Service - Pagination Issue
// File: packages/core/src/services/module-manager.ts

import { BaseService } from './base';
import { Module, ModuleManifest } from '../types/module';
import { ModuleDocument, ModuleModel } from '../models/module';
import { ModuleInstaller } from './module-installer';
import { ModuleValidator } from './module-validator';
import { EventEmitter } from 'events';
import { ValidationError, NotFoundError } from '../errors';
import * as path from 'path';
import * as fs from 'fs';
export class ModuleManager extends BaseService<ModuleDocument> {
  private installer: ModuleInstaller;
  private validator: ModuleValidator;
  private eventEmitter: EventEmitter;
  private activeModules: Map<string, any> = new Map();
  private registeredRoutes: Map<string, any> = new Map();

  constructor() {
    super(ModuleModel, 'ModuleManager');
    this.installer = new ModuleInstaller();
    this.validator = new ModuleValidator();
    this.eventEmitter = new EventEmitter();
  }

  async uploadModule(
    file: Buffer,
    filename: string,
    userId: string
  ): Promise<{ success: boolean; module?: ModuleDocument; error?: string }> {
    try {
      // 1. Extract and validate module
      const extractPath = await this.installer.extractModule(file, filename);
      const manifest = await this.validator.validateModule(extractPath);
      
      // 2. Check if module already exists
      const existingModule = await ModuleModel.findOne({ 'manifest.slug': manifest.slug });
      if (existingModule) {
        return { success: false, error: `Module ${manifest.slug} is already installed` };
      }
      
      // 3. Check compatibility
      const compatibility = await this.validator.checkCompatibility(manifest);
      if (!compatibility.compatible) {
        return { success: false, error: compatibility.error };
      }

      // 4. Install module
      const module = await this.installModule(manifest, extractPath, userId);
      
      // 5. Cleanup temp files
      await this.installer.cleanupTemp();
      
      return { success: true, module };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async installModule(
    manifest: ModuleManifest,
    sourcePath: string,
    userId: string
  ): Promise<ModuleDocument> {
    // 1. Copy module files
    const installPath = await this.installer.installFiles(manifest, sourcePath);
    
    // 2. Create module record
    const module = await this.create({
      manifest,
      status: 'installed',
      installPath,
      configValues: manifest.defaultConfig || {},
      installedBy: userId,
      installedAt: new Date(),
      errorCount: 0
    } as Partial<Module>);

    // 3. Run database migrations
    if (manifest.dbMigrations?.length) {
      try {
        await this.installer.runMigrations(manifest.dbMigrations, installPath);
      } catch (error: any) {
        await this.updateByIdOrThrow(module.id, {
          status: 'error',
          lastError: `Migration failed: ${error.message}`
        });
        throw error;
      }
    }

    this.eventEmitter.emit('module:installed', { module, userId });
    this.logger.info(`Module ${manifest.slug} installed successfully`);
    
    return module;
  }

private async loadModuleClass(module: ModuleDocument): Promise<any> {
    try {
      // Construct the full path to the module file
      const modulePath = path.resolve(module.installPath, module.manifest.main);
      
      console.log(`🔄 Loading module from: ${modulePath}`);
      
      // Check if file exists
      if (!fs.existsSync(modulePath)) {
        // Try alternative paths
        const alternatives = [
          path.resolve(module.installPath, 'index.js'),
          path.resolve(module.installPath, 'index.ts'),
          path.resolve(module.installPath, module.manifest.main.replace('.ts', '.js'))
        ];
        
        let foundPath: string | null = null;
        for (const altPath of alternatives) {
          if (fs.existsSync(altPath)) {
            foundPath = altPath;
            break;
          }
        }
        
        if (!foundPath) {
          throw new Error(`Module file not found: ${modulePath}`);
        }
        
        console.log(`📍 Using alternative path: ${foundPath}`);
        // Update the path to the found one
        const updatedModulePath = foundPath;
        
        // Clear require cache
        delete require.cache[require.resolve(updatedModulePath)];
        
        // Dynamic import
        const ModuleClass = require(updatedModulePath);
        return ModuleClass.default || ModuleClass;
      }
      
      // Clear require cache to allow hot reloading
      delete require.cache[require.resolve(modulePath)];
      
      // Load the module
      const ModuleClass = require(modulePath);
      const FinalClass = ModuleClass.default || ModuleClass;
      
      console.log(`✅ Module class loaded successfully`);
      return FinalClass;
    } catch (error: any) {
      console.error(`❌ Failed to load module class:`, error);
      throw new Error(`Failed to load module: ${error.message}`);
    }
  }

  // FIXED: Better activation with detailed error logging
  async activateModule(moduleId: string, userId: string): Promise<ModuleDocument> {
    const module = await this.findByIdOrThrow(moduleId);
    
    console.log(`🚀 Activating module: ${module.manifest.name} (${module.manifest.slug})`);
    
    // Only allow activation if status is 'installed' or 'inactive'
    if (!(module.status === 'installed' || module.status === 'inactive')) {
      throw new ValidationError(`Module cannot be activated. Current status: ${module.status}`);
    }
    
    try {
      // 1. Load and instantiate module
      console.log(`📦 Loading module class...`);
      const ModuleClass = await this.loadModuleClass(module);
      
      console.log(`🔧 Instantiating module with config:`, module.configValues);
      const moduleInstance = new ModuleClass(module.configValues);
      
      // 2. Initialize module
      if (typeof moduleInstance.initialize === 'function') {
        console.log(`⚡ Initializing module...`);
        await moduleInstance.initialize();
      } else {
        console.log(`ℹ️  Module has no initialize method`);
      }
      
      // 3. Register hooks
      console.log(`🎣 Registering hooks...`);
      await this.registerModuleHooks(module.manifest, moduleInstance);
      
      // 4. Register API routes
      if (module.manifest.apiRoutes?.length) {
        console.log(`🛣️  Registering ${module.manifest.apiRoutes.length} API routes...`);
        await this.registerApiRoutes(module.manifest, moduleInstance);
      }
      
      // 5. Store active module instance
      this.activeModules.set(module.manifest.slug, moduleInstance);
      
      // 6. Update status
      const updatedModule = await this.updateByIdOrThrow(moduleId, {
        status: 'active',
        activatedAt: new Date(),
        lastError: undefined
      });

      this.eventEmitter.emit('module:activated', { module: updatedModule, userId });
      this.logger.info(`✅ Module ${module.manifest.slug} activated successfully`);
      
      return updatedModule;
    } catch (error: any) {
      console.error(`❌ Module activation failed:`, error);
      
      await this.updateByIdOrThrow(moduleId, {
        status: 'error',
        lastError: error.message,
        errorCount: module.errorCount + 1
      });
      throw error;
    }
  }

  async deactivateModule(moduleId: string, userId: string): Promise<ModuleDocument> {
    const module = await this.findByIdOrThrow(moduleId);
    
    // Only allow deactivation if status is 'active'
    if (module.status !== 'active') {
      throw new ValidationError(`Module cannot be deactivated. Current status: ${module.status}`);
    }
    
    try {
      // 1. Get module instance
      const moduleInstance = this.activeModules.get(module.manifest.slug);
      
      if (moduleInstance) {
        // 2. Cleanup
        if (typeof moduleInstance.cleanup === 'function') {
          await moduleInstance.cleanup();
        }
        
        // 3. Unregister hooks
        await this.unregisterModuleHooks(module.manifest);
        
        // 4. Unregister API routes
        await this.unregisterApiRoutes(module.manifest);
        
        // 5. Remove from active modules
        this.activeModules.delete(module.manifest.slug);
      }

      // 6. Update status
      const updatedModule = await this.updateByIdOrThrow(moduleId, {
        status: 'inactive'
      });

      this.eventEmitter.emit('module:deactivated', { module: updatedModule, userId });
      this.logger.info(`Module ${module.manifest.slug} deactivated successfully`);
      
      return updatedModule;
    } catch (error: any) {
      this.logger.error(`Failed to deactivate module ${module.manifest.slug}:`, error);
      throw error;
    }
  }

  async uninstallModule(moduleId: string, userId: string): Promise<void> {
    const module = await this.findByIdOrThrow(moduleId);
    
    // 1. Deactivate if active
    if (module.status === 'active') {
      await this.deactivateModule(moduleId, userId);
    }

    // 2. Run uninstall script if exists
    if (module.manifest.uninstallScript) {
      try {
        const uninstallPath = path.join(module.installPath, module.manifest.uninstallScript);
        const uninstallModule = await import(uninstallPath);
        if (typeof uninstallModule.uninstall === 'function') {
          await uninstallModule.uninstall();
        }
      } catch (error) {
        this.logger.error(`Uninstall script failed for ${module.manifest.slug}:`, error);
      }
    }

    // 3. Rollback migrations
    if (module.manifest.dbMigrations?.length) {
      try {
        await this.installer.rollbackMigrations(module.manifest.dbMigrations, module.installPath);
      } catch (error) {
        this.logger.error(`Migration rollback failed for ${module.manifest.slug}:`, error);
      }
    }

    // 4. Remove files
    await this.installer.removeFiles(module.installPath);
    
    // 5. Remove from database
    await this.deleteByIdOrThrow(moduleId);

    this.eventEmitter.emit('module:uninstalled', { module, userId });
    this.logger.info(`Module ${module.manifest.slug} uninstalled successfully`);
  }

  async updateModuleConfig(
    moduleId: string,
    config: Record<string, any>,
    userId: string
  ): Promise<ModuleDocument> {
    const module = await this.findByIdOrThrow(moduleId);
    
    // Validate config against module settings
    const errors = await this.validator.validateConfig(config, module.manifest.settings);
    if (errors.length > 0) {
      throw new ValidationError(`Invalid configuration: ${errors.join(', ')}`);
    }

    const updatedModule = await this.updateByIdOrThrow(moduleId, {
      configValues: { ...module.configValues, ...config }
    });

    // If module is active, update its configuration
    const moduleInstance = this.activeModules.get(module.manifest.slug);
    if (moduleInstance && typeof moduleInstance.updateConfig === 'function') {
      await moduleInstance.updateConfig(updatedModule.configValues);
    }

    this.eventEmitter.emit('module:config-updated', { module: updatedModule, config, userId });
    return updatedModule;
  }

 async getAvailableModules(): Promise<ModuleDocument[]> {
    try {
      console.log(`📋 Fetching available modules...`);
      const result = await this.findMany({ 
        status: { $in: ['installed', 'active', 'inactive', 'error'] } 
      });
      console.log(`📊 Found ${result.data.length} modules in database`);
      return result.data;
    } catch (error) {
      console.error(`❌ Failed to fetch available modules:`, error);
      throw error;
    }
  }

  async getActiveModules(): Promise<ModuleDocument[]> {
    try {
      const result = await this.findMany({ status: 'active' });
      console.log(`🟢 Found ${result.data.length} active modules`);
      return result.data;
    } catch (error) {
      console.error(`❌ Failed to fetch active modules:`, error);
      throw error;
    }
  }

  async getModulesByCategory(category: string): Promise<ModuleDocument[]> {
    try {
      const result = await this.findMany({ 'manifest.category': category });
      console.log(`📂 Found ${result.data.length} modules in category: ${category}`);
      return result.data;
    } catch (error) {
      console.error(`❌ Failed to fetch modules by category:`, error);
      throw error;
    }
  }

  getModuleInstance(slug: string): any {
    return this.activeModules.get(slug);
  }

  async initializeInstalledModules(): Promise<void> {
    const activeModules = await this.getActiveModules();
    
    for (const module of activeModules) {
      try {
        await this.activateModule(module.id.toString(), 'system');
      } catch (error) {
        this.logger.error(`Failed to initialize module ${module.manifest.slug}:`, error);
        await this.updateByIdOrThrow(module.id, {
          status: 'error',
          lastError: `Initialization failed: ${error}`,
          errorCount: module.errorCount + 1
        });
      }
    }
  }

  private async registerModuleHooks(manifest: ModuleManifest, instance: any): Promise<void> {
    for (const hook of manifest.hooks) {
      if (typeof instance[hook.handler] === 'function') {
        this.eventEmitter.on(hook.event, instance[hook.handler].bind(instance));
      }
    }
  }

  private async unregisterModuleHooks(manifest: ModuleManifest): Promise<void> {
    for (const hook of manifest.hooks) {
      this.eventEmitter.removeAllListeners(hook.event);
    }
  }

  private async registerApiRoutes(manifest: ModuleManifest, instance: any): Promise<void> {
    for (const route of manifest.apiRoutes || []) {
      const routeKey = `${route.method}:${route.path}`;
      
      if (typeof instance[route.handler] === 'function') {
        this.registeredRoutes.set(routeKey, {
          handler: instance[route.handler].bind(instance),
          permissions: route.permissions,
          middleware: route.middleware
        });
      }
    }
  }

  private async unregisterApiRoutes(manifest: ModuleManifest): Promise<void> {
    for (const route of manifest.apiRoutes || []) {
      const routeKey = `${route.method}:${route.path}`;
      this.registeredRoutes.delete(routeKey);
    }
  }

  getRegisteredRoute(method: string, path: string): any {
    return this.registeredRoutes.get(`${method}:${path}`);
  }

  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  emit(event: string, ...args: any[]): boolean {
    return this.eventEmitter.emit(event, ...args);
  }
}