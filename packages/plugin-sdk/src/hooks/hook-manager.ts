import { EventEmitter } from 'events';
import { PluginHooks, HookRegistration, HookPriority, HookContext, HookResult } from '../types';
import { Logger } from '../utils';

export class HookManager extends EventEmitter {
  private hooks: Map<keyof PluginHooks, HookRegistration[]> = new Map();
  private logger: Logger;

  constructor() {
    super();
    this.logger = new Logger('HookManager');
  }

  // Register a hook
  public registerHook<K extends keyof PluginHooks>(
    hookName: K,
    callback: PluginHooks[K],
    pluginId: string,
    priority: HookPriority = HookPriority.NORMAL
  ): void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }

    const registration: HookRegistration = {
      hook: hookName,
      callback: callback as Function,
      priority,
      pluginId
    };

    const hookList = this.hooks.get(hookName)!;
    hookList.push(registration);

    // Sort by priority (lower number = higher priority)
    hookList.sort((a, b) => a.priority - b.priority);

    this.logger.debug(`Registered hook ${hookName} for plugin ${pluginId} with priority ${priority}`);
    this.emit('hook-registered', { hookName, pluginId, priority });
  }

  // Unregister hooks for a plugin
  public unregisterPluginHooks(pluginId: string): void {
    let removedCount = 0;

    for (const [hookName, registrations] of this.hooks.entries()) {
      const originalLength = registrations.length;
      const filtered = registrations.filter(reg => reg.pluginId !== pluginId);
      
      if (filtered.length !== originalLength) {
        this.hooks.set(hookName, filtered);
        removedCount += originalLength - filtered.length;
      }
    }

    this.logger.debug(`Unregistered ${removedCount} hooks for plugin ${pluginId}`);
    this.emit('hooks-unregistered', { pluginId, count: removedCount });
  }

  // Execute hooks
  public async executeHook<K extends keyof PluginHooks>(
    hookName: K,
    context: HookContext,
    ...args: Parameters<PluginHooks[K]>
  ): Promise<HookResult[]> {
    const registrations = this.hooks.get(hookName) || [];
    const results: HookResult[] = [];

    this.logger.debug(`Executing hook ${hookName} with ${registrations.length} handlers`);

    for (const registration of registrations) {
      try {
        const startTime = Date.now();
        const result = await registration.callback(context, ...args);
        const duration = Date.now() - startTime;

        const hookResult: HookResult = {
          data: result,
          modified: true,
          stop: false,
          ...result
        };

        results.push(hookResult);

        this.logger.debug(
          `Hook ${hookName} executed for plugin ${registration.pluginId} in ${duration}ms`
        );

        // If hook requests to stop execution
        if (hookResult.stop) {
          this.logger.debug(`Hook execution stopped by plugin ${registration.pluginId}`);
          break;
        }

      } catch (error) {
        this.logger.error(
          `Error executing hook ${hookName} for plugin ${registration.pluginId}:`,
          error
        );

        results.push({
          data: null,
          modified: false,
          stop: false,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    }

    return results;
  }

  // Get registered hooks
  public getHooks(hookName?: keyof PluginHooks): Map<keyof PluginHooks, HookRegistration[]> {
    if (hookName) {
      const result = new Map<keyof PluginHooks, HookRegistration[]>();
      const registrations = this.hooks.get(hookName);
      if (registrations) {
        result.set(hookName, registrations);
      }
      return result;
    }
    return new Map(this.hooks);
  }

  // Get hooks for a specific plugin
  public getPluginHooks(pluginId: string): Map<keyof PluginHooks, HookRegistration[]> {
    const result = new Map<keyof PluginHooks, HookRegistration[]>();

    for (const [hookName, registrations] of this.hooks.entries()) {
      const pluginRegistrations = registrations.filter(reg => reg.pluginId === pluginId);
      if (pluginRegistrations.length > 0) {
        result.set(hookName, pluginRegistrations);
      }
    }

    return result;
  }

  // Clear all hooks
  public clear(): void {
    this.hooks.clear();
    this.logger.debug('Cleared all hooks');
    this.emit('hooks-cleared');
  }
}