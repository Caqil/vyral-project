// apps/web/src/lib/plugin-manager.ts
interface PluginMenuItem {
  title: string;
  slug: string;
  icon?: string;
  parent?: string;
  children?: PluginMenuItem[];
  component?: string;
  permission?: string;
  order?: number;
  badge?: string | number;
}

interface PluginInstance {
  id: string;
  name: string;
  version: string;
  status: 'active' | 'inactive';
  config: any;
  hooks: Map<string, Function[]>;
  adminPages: PluginMenuItem[];
  settings: any[];
}

interface HookContext {
  pluginId?: string;
  user?: any;
  request?: any;
  [key: string]: any;
}

interface HookResult<T = any> {
  data: T;
  modified: boolean;
  stop?: boolean;
}

class PluginManager {
  private static instance: PluginManager;
  private activePlugins: Map<string, PluginInstance> = new Map();
  private hooks: Map<string, Array<{ pluginId: string; callback: Function; priority: number }>> = new Map();
  private initialized = false;

  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log('Initializing Plugin Manager...');
    
    try {
      // Load active plugins from API
      const activePluginIds = await this.getActivePluginIds();
      
      // Load each active plugin
      for (const pluginId of activePluginIds) {
        await this.loadPlugin(pluginId);
      }
      
      this.initialized = true;
      console.log(`Plugin Manager initialized with ${this.activePlugins.size} plugins`);
    } catch (error) {
      console.error('Failed to initialize Plugin Manager:', error);
    }
  }

  private async getActivePluginIds(): Promise<string[]> {
    try {
      const response = await fetch('/api/admin/plugins/active');
      if (!response.ok) {
        throw new Error('Failed to fetch active plugins');
      }
      
      const plugins = await response.json();
      return plugins.map((plugin: any) => plugin.id);
    } catch (error) {
      console.error('Failed to get active plugins:', error);
      // Return hardcoded list for testing
      return ['oauth2-plugin', 'comment-plugin', 'seo-plugin', 'analytics-plugin'];
    }
  }

  async loadPlugin(pluginId: string): Promise<void> {
    try {
      console.log(`Loading plugin: ${pluginId}`);
      
      // Load plugin configuration
      const configResponse = await fetch(`/api/admin/plugins/${pluginId}/config`);
      const config = await configResponse.json();
      
      // Create plugin instance
      const pluginInstance: PluginInstance = {
        id: pluginId,
        name: config.name || pluginId,
        version: config.version || '1.0.0',
        status: 'active',
        config,
        hooks: new Map(),
        adminPages: config.adminPages || [],
        settings: config.settings || []
      };

      // Register plugin hooks
      if (config.hooks) {
        for (const hookName of config.hooks) {
          this.registerHook(hookName, pluginId, async (data: any, context: HookContext) => {
            return await this.executePluginHook(pluginId, hookName, data, context);
          });
        }
      }

      this.activePlugins.set(pluginId, pluginInstance);
      console.log(`Plugin ${pluginId} loaded successfully`);
    } catch (error) {
      console.error(`Failed to load plugin ${pluginId}:`, error);
    }
  }

  private registerHook(hookName: string, pluginId: string, callback: Function, priority = 10): void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
    
    const hookArray = this.hooks.get(hookName)!;
    hookArray.push({ pluginId, callback, priority });
    
    // Sort by priority (lower number = higher priority)
    hookArray.sort((a, b) => a.priority - b.priority);
  }

  async executeHook<T = any>(hookName: string, data: T, context: HookContext = {}): Promise<T> {
    const hookCallbacks = this.hooks.get(hookName);
    
    if (!hookCallbacks || hookCallbacks.length === 0) {
      return data;
    }

    let result = data;
    
    for (const { pluginId, callback } of hookCallbacks) {
      try {
        const hookResult = await callback(result, { ...context, pluginId });
        
        if (hookResult && typeof hookResult === 'object' && 'data' in hookResult) {
          const typedResult = hookResult as HookResult<T>;
          if (typedResult.modified) {
            result = typedResult.data;
          }
          if (typedResult.stop) {
            break;
          }
        }
      } catch (error) {
        console.error(`Hook ${hookName} failed for plugin ${pluginId}:`, error);
      }
    }
    
    return result;
  }

  private async executePluginHook(pluginId: string, hookName: string, data: any, context: HookContext): Promise<HookResult> {
    try {
      // Call the actual plugin implementation via API
      const response = await fetch('/api/admin/plugins/execute-hook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pluginId,
          hookName,
          data,
          context
        })
      });

      if (!response.ok) {
        throw new Error(`Hook execution failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`Failed to execute hook ${hookName} for plugin ${pluginId}:`, error);
      return { data, modified: false };
    }
  }

  async getAdminMenuItems(): Promise<PluginMenuItem[]> {
    const menuItems: PluginMenuItem[] = [];
    
    for (const [pluginId, plugin] of this.activePlugins) {
      // Add main admin pages
      for (const adminPage of plugin.adminPages) {
        if (!adminPage.parent) {
          menuItems.push({
            ...adminPage,
            slug: adminPage.slug,
            icon: adminPage.icon || 'Settings'
          });
        }
      }
    }

    // Execute admin:menu hook for additional customization
    return await this.executeHook('admin:menu', menuItems);
  }

  async getSettingsMenuItems(): Promise<PluginMenuItem[]> {
    const settingsItems: PluginMenuItem[] = [];
    
    for (const [pluginId, plugin] of this.activePlugins) {
      // Add settings pages (admin pages with parent = "settings")
      for (const adminPage of plugin.adminPages) {
        if (adminPage.parent === 'settings') {
          settingsItems.push({
            ...adminPage,
            slug: adminPage.slug,
            icon: adminPage.icon || 'Settings'
          });
        }
      }
    }

    return settingsItems;
  }

  getActivePlugins(): Map<string, PluginInstance> {
    return this.activePlugins;
  }

  isPluginActive(pluginId: string): boolean {
    return this.activePlugins.has(pluginId) && 
           this.activePlugins.get(pluginId)?.status === 'active';
  }

  async refreshPlugins(): Promise<void> {
    console.log('Refreshing plugins...');
    this.activePlugins.clear();
    this.hooks.clear();
    this.initialized = false;
    await this.initialize();
  }
}

// Export singleton instance
export const pluginManager = PluginManager.getInstance();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  pluginManager.initialize().catch(console.error);
}

export default pluginManager;