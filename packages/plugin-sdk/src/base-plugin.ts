import { EventEmitter } from 'events';
import { Logger } from './utils';
import { PluginConfig, PluginContext } from './types/plugin';
import { HookPriority, PluginHooks } from './types/hooks';

export abstract class BasePlugin extends EventEmitter {
  public config: PluginConfig;
  protected context: PluginContext;
  protected logger: Logger;
  protected hooks: Map<keyof PluginHooks, Array<{ callback: Function; priority: HookPriority }>> = new Map();
  protected components: Map<string, any> = new Map();
  protected routes: Map<string, any> = new Map();
  protected settings: Map<string, any> = new Map();

  constructor(config: PluginConfig, context: PluginContext) {
    super();
    this.config = config;
    this.context = context;
    this.logger = new Logger(this.config.name);
  }

  // Lifecycle methods
  public async activate(): Promise<void> {
    this.logger.info(`Activating plugin: ${this.config.name}`);
    
    try {
      await this.onActivate();
      this.registerHooks();
      this.registerComponents();
      this.registerRoutes();
      this.loadSettings();
      
      this.emit('activated');
      this.logger.info(`Plugin activated successfully: ${this.config.name}`);
    } catch (error) {
      this.logger.error(`Failed to activate plugin: ${this.config.name}`, error);
      throw error;
    }
  }

  public async deactivate(): Promise<void> {
    this.logger.info(`Deactivating plugin: ${this.config.name}`);
    
    try {
      await this.onDeactivate();
      this.unregisterHooks();
      this.unregisterComponents();
      this.unregisterRoutes();
      
      this.emit('deactivated');
      this.logger.info(`Plugin deactivated successfully: ${this.config.name}`);
    } catch (error) {
      this.logger.error(`Failed to deactivate plugin: ${this.config.name}`, error);
      throw error;
    }
  }

  // Abstract lifecycle hooks (to be implemented by plugins)
  protected async onActivate(): Promise<void> {
    // Override in subclass
  }

  protected async onDeactivate(): Promise<void> {
    // Override in subclass
  }

  protected abstract registerHooks(): void;

  // Hook registration helpers
  protected registerHook<K extends keyof PluginHooks>(
    hookName: K,
    callback: PluginHooks[K],
    priority: HookPriority = HookPriority.NORMAL
  ): void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
    
    const hookList = this.hooks.get(hookName)!;
    hookList.push({ callback: callback as Function, priority });
    
    // Sort by priority (lower number = higher priority)
    hookList.sort((a, b) => a.priority - b.priority);
    
    this.logger.debug(`Registered hook: ${hookName} with priority ${priority}`);
  }

  protected unregisterHook<K extends keyof PluginHooks>(
    hookName: K,
    callback?: PluginHooks[K]
  ): void {
    if (!this.hooks.has(hookName)) return;
    
    if (callback) {
      const hookList = this.hooks.get(hookName)!;
      const index = hookList.findIndex(h => h.callback === callback);
      if (index > -1) {
        hookList.splice(index, 1);
      }
    } else {
      this.hooks.delete(hookName);
    }
    
    this.logger.debug(`Unregistered hook: ${hookName}`);
  }

  protected unregisterHooks(): void {
    this.hooks.clear();
    this.logger.debug('Unregistered all hooks');
  }

  // Component registration
  protected registerComponent(name: string, component: any, type: string = 'custom'): void {
    this.components.set(name, { component, type, pluginId: this.config.name });
    this.logger.debug(`Registered component: ${name}`);
  }

  protected unregisterComponent(name: string): void {
    this.components.delete(name);
    this.logger.debug(`Unregistered component: ${name}`);
  }

  protected registerComponents(): void {
    // Override in subclass to register components
  }

  protected unregisterComponents(): void {
    this.components.clear();
    this.logger.debug('Unregistered all components');
  }

  // Route registration
  protected registerRoute(path: string, handler: any, method: string = 'GET'): void {
    const routeKey = `${method}:${path}`;
    this.routes.set(routeKey, { handler, pluginId: this.config.name });
    this.logger.debug(`Registered route: ${routeKey}`);
  }

  protected unregisterRoute(path: string, method: string = 'GET'): void {
    const routeKey = `${method}:${path}`;
    this.routes.delete(routeKey);
    this.logger.debug(`Unregistered route: ${routeKey}`);
  }

  protected registerRoutes(): void {
    // Override in subclass to register routes
  }

  protected unregisterRoutes(): void {
    this.routes.clear();
    this.logger.debug('Unregistered all routes');
  }

  // Settings management
  protected async loadSettings(): Promise<void> {
    if (!this.config.settings) return;
    
    for (const setting of this.config.settings) {
      const value = await this.context.api.getPluginSetting(setting.key, setting.default);
      this.settings.set(setting.key, value);
    }
    
    this.logger.debug('Loaded plugin settings');
  }

  protected async getSetting<T>(key: string, defaultValue?: T): Promise<T> {
    return this.settings.get(key) ?? defaultValue;
  }

  protected async setSetting<T>(key: string, value: T): Promise<void> {
    this.settings.set(key, value);
    await this.context.api.setPluginSetting(key, value);
    this.logger.debug(`Updated setting: ${key}`);
  }

  // Public utility methods (accessible by PluginManager)
  public getConfig(): PluginConfig {
    return this.config;
  }

  public getContext(): PluginContext {
    return this.context;
  }

  // FIXED: Changed from protected to public for PluginManager access
  public getHooks(): Map<keyof PluginHooks, Array<{ callback: Function; priority: HookPriority }>> {
    return this.hooks;
  }

  public getComponents(): Map<string, any> {
    return this.components;
  }

  public getRoutes(): Map<string, any> {
    return this.routes;
  }

  public getSettings(): Map<string, any> {
    return new Map(this.settings); // Return a copy to prevent external modification
  }

  // Additional public methods for plugin introspection
  public hasHook<K extends keyof PluginHooks>(hookName: K): boolean {
    return this.hooks.has(hookName) && this.hooks.get(hookName)!.length > 0;
  }

  public getHookCount(): number {
    return Array.from(this.hooks.values()).reduce((total, hooks) => total + hooks.length, 0);
  }

  public getComponentNames(): string[] {
    return Array.from(this.components.keys());
  }

  public getRouteKeys(): string[] {
    return Array.from(this.routes.keys());
  }

  public getStatus(): 'active' | 'inactive' | 'error' {
    // This could be enhanced to track actual status
    return 'active'; // Default implementation
  }

  // Error handling
  protected handleError(error: Error, operation: string): void {
    this.logger.error(`Error in ${operation}:`, error);
    this.emit('error', error, operation);
  }
}