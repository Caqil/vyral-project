import { EventEmitter } from 'events';
import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { BasePlugin } from './base-plugin';
import { 
  PluginConfig, 
  PluginInstance, 
  PluginMetadata, 
  PluginInstallOptions,
  PluginContext,
} from './types/plugin';
import { Logger, validatePluginConfig } from './utils';
import { PluginHooks } from './types/hooks';

// Type for plugin constructor
type PluginConstructor = new (context: PluginContext) => BasePlugin;

// Type guard to check if something is a plugin constructor
function isPluginConstructor(value: any): value is PluginConstructor {
  return typeof value === 'function' && 
         value.prototype && 
         (value.prototype instanceof BasePlugin || value === BasePlugin);
}

export class PluginManager extends EventEmitter {
  private plugins: Map<string, PluginInstance> = new Map();
  private metadata: Map<string, PluginMetadata> = new Map();
  private pluginsDirectory: string;
  private logger: Logger;
  private isInitialized: boolean = false;

  constructor(pluginsDirectory: string = './plugins') {
    super();
    this.pluginsDirectory = pluginsDirectory;
    this.logger = new Logger('PluginManager');
  }

  // Initialize the plugin manager
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Plugin manager already initialized');
      return;
    }

    this.logger.info('Initializing plugin manager...');
    
    try {
      await this.loadPlugins();
      await this.loadMetadata();
      this.isInitialized = true;
      this.emit('initialized');
      this.logger.info('Plugin manager initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize plugin manager:', error);
      throw error;
    }
  }

  // Load all plugins from the plugins directory
  private async loadPlugins(): Promise<void> {
    try {
      const pluginDirs = await readdir(this.pluginsDirectory);
      
      for (const dir of pluginDirs) {
        const pluginPath = join(this.pluginsDirectory, dir);
        const pluginStat = await stat(pluginPath);
        
        if (pluginStat.isDirectory()) {
          await this.loadPlugin(dir, pluginPath);
        }
      }
      
      this.logger.info(`Loaded ${this.plugins.size} plugins`);
    } catch (error) {
      this.logger.error('Failed to load plugins:', error);
    }
  }

  // Load a single plugin
  private async loadPlugin(pluginId: string, pluginPath: string): Promise<void> {
    try {
      const configPath = join(pluginPath, 'plugin.config.json');
      const indexPath = join(pluginPath, 'dist', 'index.js');
      
      // Load plugin configuration
      const configContent = await readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent) as PluginConfig;
      
      // Validate configuration
      const validationResult = validatePluginConfig(config);
      if (!validationResult.success) {
        throw new Error(`Invalid plugin configuration: ${validationResult.error?.message}`);
      }

      // Check if plugin file exists
      try {
        await stat(indexPath);
      } catch {
        this.logger.warn(`Plugin ${pluginId} not built. Skipping...`);
        return;
      }

      // Create plugin instance record
      const pluginInstance: PluginInstance = {
        id: pluginId,
        config: validationResult.data!,
        instance: null,
        hooks: new Map(),
        routes: new Map(),
        adminPages: new Map(),
        settings: new Map(),
        assets: [],
        components: new Map(),
        status: 'loaded',
      };

      this.plugins.set(pluginId, pluginInstance);
      this.logger.debug(`Loaded plugin: ${pluginId}`);
      
    } catch (error) {
      this.logger.error(`Failed to load plugin ${pluginId}:`, error);
    }
  }

  // Install a plugin
  public async installPlugin(options: PluginInstallOptions): Promise<string> {
    this.logger.info(`Installing plugin from ${options.source}`);
    
    try {
      let pluginId: string;
      
      switch (options.source) {
        case 'registry':
          if (!options.url) throw new Error('URL required for registry installation');
          pluginId = await this.installFromRegistry(options.url);
          break;
          
        case 'upload':
          if (!options.file) throw new Error('File required for upload installation');
          pluginId = await this.installFromUpload(options.file);
          break;
          
        case 'git':
          if (!options.url) throw new Error('URL required for Git installation');
          pluginId = await this.installFromGit(options.url);
          break;
          
        case 'local':
          if (!options.url) throw new Error('Path required for local installation');
          pluginId = await this.installFromLocal(options.url);
          break;
          
        default:
          throw new Error(`Unsupported installation source: ${options.source}`);
      }
      
      // Load the newly installed plugin
      const pluginPath = join(this.pluginsDirectory, pluginId);
      await this.loadPlugin(pluginId, pluginPath);
      
      // Activate if requested
      if (options.activate) {
        await this.activatePlugin(pluginId);
      }
      
      this.emit('plugin-installed', pluginId);
      this.logger.info(`Plugin installed successfully: ${pluginId}`);
      
      return pluginId;
    } catch (error) {
      this.logger.error('Failed to install plugin:', error);
      throw error;
    }
  }

  // Activate a plugin
  public async activatePlugin(pluginId: string): Promise<void> {
    this.logger.info(`Activating plugin: ${pluginId}`);
    
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginId}`);
      }

      if (plugin.status === 'activated') {
        this.logger.warn(`Plugin already activated: ${pluginId}`);
        return;
      }

      // Check dependencies
      await this.checkDependencies(plugin.config);

      // Create plugin context
      const context = this.createPluginContext(pluginId, plugin.config);

      // Load and instantiate plugin
      const PluginClass: PluginConstructor = await this.loadPluginClass(pluginId);
      const pluginInstance: BasePlugin = new PluginClass(context);

      // Validate that the instance is actually a BasePlugin
      if (!(pluginInstance instanceof BasePlugin)) {
        throw new Error(`Plugin ${pluginId} does not extend BasePlugin`);
      }

      // Activate the plugin
      await pluginInstance.activate();

      // Update plugin instance
      plugin.instance = pluginInstance;
      plugin.status = 'activated';
      // Transform hooks to Map<string, Function[]>
      const rawHooks = pluginInstance.getHooks();
      const hooksMap = new Map<string, Function[]>();
      for (const [hookName, arr] of rawHooks.entries()) {
        hooksMap.set(String(hookName), arr.map(h => h.callback));
      }
      plugin.hooks = hooksMap;
      plugin.components = pluginInstance.getComponents();
      plugin.routes = pluginInstance.getRoutes();

      // Update metadata
      const metadata = this.metadata.get(pluginId);
      if (metadata) {
        metadata.status = 'active';
        metadata.activatedAt = new Date();
      }

      this.emit('plugin-activated', pluginId);
      this.logger.info(`Plugin activated successfully: ${pluginId}`);
      
    } catch (error) {
      this.logger.error(`Failed to activate plugin ${pluginId}:`, error);
      
      // Update error status
      const plugin = this.plugins.get(pluginId);
      if (plugin) {
        plugin.status = 'error';
        plugin.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      }
      
      throw error;
    }
  }

  // Deactivate a plugin
  public async deactivatePlugin(pluginId: string): Promise<void> {
    this.logger.info(`Deactivating plugin: ${pluginId}`);
    
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginId}`);
      }

      if (plugin.status !== 'activated') {
        this.logger.warn(`Plugin not activated: ${pluginId}`);
        return;
      }

      // Check for dependent plugins
      const dependents = this.getActiveDependentPlugins(pluginId);
      if (dependents.length > 0) {
        throw new Error(`Cannot deactivate plugin. The following active plugins depend on it: ${dependents.join(', ')}`);
      }

      // Deactivate the plugin
      if (plugin.instance) {
        await plugin.instance.deactivate();
      }

      // Update plugin instance
      plugin.instance = null;
      plugin.status = 'loaded';
      plugin.hooks.clear();
      plugin.components.clear();
      plugin.routes.clear();

      // Update metadata
      const metadata = this.metadata.get(pluginId);
      if (metadata) {
        metadata.status = 'inactive';
        metadata.activatedAt = undefined;
      }

      this.emit('plugin-deactivated', pluginId);
      this.logger.info(`Plugin deactivated successfully: ${pluginId}`);
      
    } catch (error) {
      this.logger.error(`Failed to deactivate plugin ${pluginId}:`, error);
      throw error;
    }
  }

  // Uninstall a plugin
  public async uninstallPlugin(pluginId: string): Promise<void> {
    this.logger.info(`Uninstalling plugin: ${pluginId}`);
    
    try {
      // Deactivate first if active
      if (this.isPluginActive(pluginId)) {
        await this.deactivatePlugin(pluginId);
      }

      // Remove from memory
      this.plugins.delete(pluginId);
      this.metadata.delete(pluginId);

      // Remove files
      await this.removePluginFiles(pluginId);

      this.emit('plugin-uninstalled', pluginId);
      this.logger.info(`Plugin uninstalled successfully: ${pluginId}`);
      
    } catch (error) {
      this.logger.error(`Failed to uninstall plugin ${pluginId}:`, error);
      throw error;
    }
  }

  // Get plugin information
  public getPlugin(pluginId: string): PluginInstance | null {
    return this.plugins.get(pluginId) || null;
  }

  public getAllPlugins(): Map<string, PluginInstance> {
    return new Map(this.plugins);
  }

  public getActivePlugins(): Map<string, PluginInstance> {
    const activePlugins = new Map<string, PluginInstance>();
    
    for (const [id, plugin] of this.plugins) {
      if (plugin.status === 'activated') {
        activePlugins.set(id, plugin);
      }
    }
    
    return activePlugins;
  }

  public isPluginActive(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    return plugin?.status === 'activated';
  }

  // Execute hooks
  public async executeHook<K extends keyof PluginHooks>(
    hookName: K,
    ...args: Parameters<PluginHooks[K]>
  ): Promise<any[]> {
    const results: any[] = [];
    const activePlugins = this.getActivePlugins();
    
    for (const [pluginId, plugin] of activePlugins) {
      const hookCallbacks = plugin.hooks.get(hookName);
      
      if (hookCallbacks && hookCallbacks.length > 0) {
        for (const callback of hookCallbacks) {
          try {
            const result = await callback(...args);
            results.push(result);
            
            // If hook returns a result with stop=true, break execution
            if (result && result.stop) {
              break;
            }
          } catch (error) {
            this.logger.error(`Error executing hook ${String(hookName)} in plugin ${pluginId}:`, error);
          }
        }
      }
    }
    
    return results;
  }

  // Load metadata for all plugins
  private async loadMetadata(): Promise<void> {
    // Implementation for loading plugin metadata
    this.logger.debug('Loading plugin metadata...');
  }

  // Helper methods
  private async installFromRegistry(url: string): Promise<string> {
    // Implementation for installing from plugin registry
    throw new Error('Registry installation not implemented');
  }

  private async installFromUpload(file: File): Promise<string> {
    // Implementation for installing from uploaded file
    throw new Error('Upload installation not implemented');
  }

  private async installFromGit(url: string): Promise<string> {
    // Implementation for installing from Git repository
    throw new Error('Git installation not implemented');
  }

  private async installFromLocal(path: string): Promise<string> {
    // Implementation for installing from local path
    throw new Error('Local installation not implemented');
  }

  private async checkDependencies(config: PluginConfig): Promise<void> {
    if (!config.dependencies) return;
    
    for (const [depName, depVersion] of Object.entries(config.dependencies)) {
      const depPlugin = Array.from(this.plugins.values()).find(p => p.config.name === depName);
      
      if (!depPlugin) {
        throw new Error(`Dependency not found: ${depName}`);
      }
      
      if (depPlugin.status !== 'activated') {
        throw new Error(`Dependency not activated: ${depName}`);
      }
      
      // TODO: Check version compatibility
    }
  }

  private getDependentPlugins(pluginId: string): string[] {
    const dependents: string[] = [];
    const targetPlugin = this.plugins.get(pluginId);
    
    if (!targetPlugin) return dependents;
    
    for (const [id, plugin] of this.plugins) {
      if (plugin.config.dependencies && targetPlugin.config.name in plugin.config.dependencies) {
        dependents.push(id);
      }
    }
    
    return dependents;
  }

  private getActiveDependentPlugins(pluginId: string): string[] {
    return this.getDependentPlugins(pluginId).filter(id => this.isPluginActive(id));
  }

  private async loadPluginClass(pluginId: string): Promise<PluginConstructor> {
    const pluginPath = join(this.pluginsDirectory, pluginId, 'dist', 'index.js');
    
    try {
      // Dynamic import of the plugin
      const pluginModule = await import(pluginPath);
      
      // Get the plugin class (default export or first named export)
      const PluginClass = pluginModule.default || pluginModule[Object.keys(pluginModule)[0]];
      
      // Validate that it's a constructor function
      if (!isPluginConstructor(PluginClass)) {
        throw new Error(`Plugin ${pluginId} does not export a valid plugin class that extends BasePlugin`);
      }
      
      return PluginClass;
    } catch (error) {
      this.logger.error(`Failed to load plugin class for ${pluginId}:`, error);
      throw new Error(`Failed to load plugin class: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createPluginContext(pluginId: string, config: PluginConfig): PluginContext {
    // Create a context object with APIs and utilities
    return {
      pluginId,
      config,
      api: {} as any, // TODO: Implement PluginAPI
      storage: {} as any, // TODO: Implement PluginStorage
      logger: new Logger(pluginId),
      events: this,
      utils: {} as any // TODO: Implement PluginUtils
    };
  }

  private async removePluginFiles(pluginId: string): Promise<void> {
    // TODO: Implement file removal
    this.logger.debug(`Would remove files for plugin: ${pluginId}`);
  }
}