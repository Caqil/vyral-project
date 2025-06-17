// packages/plugin-sdk/src/hooks/hook-executor.ts
import { EventEmitter } from 'events';
import { HookContext, HookPriority, HookRegistration, HookResult, PluginHooks } from '../types/hooks';
import { Logger } from '../utils/logger';

export interface HookExecutionOptions {
  timeout?: number;
  maxRetries?: number;
  stopOnError?: boolean;
  parallel?: boolean;
  validateResult?: boolean;
}

export interface HookExecutionResult<T = any> {
  success: boolean;
  results: HookResult<T>[];
  errors: Array<{
    pluginId: string;
    hook: string;
    error: Error;
    timestamp: Date;
  }>;
  totalExecutionTime: number;
  executedHooks: number;
  skippedHooks: number;
}

export class HookExecutor extends EventEmitter {
  private logger: Logger;
  private defaultOptions: HookExecutionOptions = {
    timeout: 30000, // 30 seconds
    maxRetries: 0,
    stopOnError: false,
    parallel: false,
    validateResult: true
  };

  constructor() {
    super();
    this.logger = new Logger('HookExecutor');
  }

  /**
   * Execute hooks sequentially
   */
  public async executeHooks<K extends keyof PluginHooks>(
    hookName: K,
    hooks: HookRegistration[],
    context: HookContext,
    initialData: any,
    options?: HookExecutionOptions
  ): Promise<HookExecutionResult> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };
    
    this.logger.debug(`Executing ${hooks.length} hooks for ${String(hookName)}`);
    this.emit('hooks-start', { hookName, hookCount: hooks.length, context });

    if (opts.parallel) {
      return this.executeHooksParallel(hookName, hooks, context, initialData, opts);
    } else {
      return this.executeHooksSequential(hookName, hooks, context, initialData, opts);
    }
  }

  /**
   * Execute hooks sequentially (one after another)
   */
  private async executeHooksSequential<K extends keyof PluginHooks>(
    hookName: K,
    hooks: HookRegistration[],
    context: HookContext,
    initialData: any,
    options: HookExecutionOptions
  ): Promise<HookExecutionResult> {
    const startTime = Date.now();
    const results: HookResult[] = [];
    const errors: Array<{ pluginId: string; hook: string; error: Error; timestamp: Date }> = [];
    let currentData = initialData;
    let executedHooks = 0;
    let skippedHooks = 0;

    // Sort hooks by priority
    const sortedHooks = [...hooks].sort((a, b) => {
      const aPriority = a.priority || HookPriority.NORMAL;
      const bPriority = b.priority || HookPriority.NORMAL;
      return aPriority - bPriority;
    });

    for (const registration of sortedHooks) {
      try {
        this.logger.debug(`Executing hook ${String(hookName)} for plugin ${registration.pluginId}`);
        this.emit('hook-start', { hookName, pluginId: registration.pluginId, context });

        const result = await this.executeHookWithTimeout(
          registration,
          currentData,
          context,
          options.timeout!
        );

        if (options.validateResult && !this.validateHookResult(result)) {
          throw new Error('Invalid hook result format');
        }

        results.push(result);
        executedHooks++;

        // Update current data if the hook modified it
        if (result.modified && result.data !== undefined) {
          currentData = result.data;
        }

        this.emit('hook-complete', { 
          hookName, 
          pluginId: registration.pluginId, 
          result, 
          context 
        });

        // Stop execution if hook requests it
        if (result.stop) {
          this.logger.debug(`Hook execution stopped by plugin ${registration.pluginId}`);
          break;
        }

      } catch (error) {
        const hookError = {
          pluginId: registration.pluginId,
          hook: hookName as string,
          error: error instanceof Error ? error : new Error(String(error)),
          timestamp: new Date()
        };

        errors.push(hookError);
        this.logger.error(`Error executing hook ${String(hookName)} for plugin ${registration.pluginId}:`, error);
        this.emit('hook-error', { hookName, pluginId: registration.pluginId, error, context });

        if (options.stopOnError) {
          this.logger.debug('Stopping hook execution due to error');
          break;
        }

        // Create a failure result
        results.push({
          data: currentData,
          modified: false,
          stop: false,
        });

        skippedHooks++;
      }
    }

    const totalExecutionTime = Date.now() - startTime;
    const executionResult: HookExecutionResult = {
      success: errors.length === 0,
      results,
      errors,
      totalExecutionTime,
      executedHooks,
      skippedHooks
    };

    this.logger.debug(`Hook execution completed in ${totalExecutionTime}ms. Executed: ${executedHooks}, Errors: ${errors.length}`);
    this.emit('hooks-complete', { hookName, result: executionResult, context });

    return executionResult;
  }

  /**
   * Execute hooks in parallel
   */
  private async executeHooksParallel<K extends keyof PluginHooks>(
    hookName: K,
    hooks: HookRegistration[],
    context: HookContext,
    initialData: any,
    options: HookExecutionOptions
  ): Promise<HookExecutionResult> {
    const startTime = Date.now();
    const errors: Array<{ pluginId: string; hook: string; error: Error; timestamp: Date }> = [];
    let executedHooks = 0;
    let skippedHooks = 0;

    // Execute all hooks in parallel
    const hookPromises = hooks.map(async (registration) => {
      try {
        this.logger.debug(`Executing hook ${String(hookName)} for plugin ${registration.pluginId} (parallel)`);
        this.emit('hook-start', { hookName, pluginId: registration.pluginId, context });

        const result = await this.executeHookWithTimeout(
          registration,
          initialData,
          context,
          options.timeout!
        );

        if (options.validateResult && !this.validateHookResult(result)) {
          throw new Error('Invalid hook result format');
        }

        this.emit('hook-complete', { 
          hookName, 
          pluginId: registration.pluginId, 
          result, 
          context 
        });

        return { success: true, result, pluginId: registration.pluginId };

      } catch (error) {
        const hookError = {
          pluginId: registration.pluginId,
          hook: hookName as string,
          error: error instanceof Error ? error : new Error(String(error)),
          timestamp: new Date()
        };

        errors.push(hookError);
        this.logger.error(`Error executing hook ${String(hookName)} for plugin ${registration.pluginId}:`, error);
        this.emit('hook-error', { hookName, pluginId: registration.pluginId, error, context });

        return { 
          success: false, 
          result: {
            data: initialData,
            modified: false,
            stop: false,
            error: hookError.error.message
          },
          pluginId: registration.pluginId 
        };
      }
    });

    const hookResults = await Promise.allSettled(hookPromises);
    const results: HookResult[] = [];

    for (const promiseResult of hookResults) {
      if (promiseResult.status === 'fulfilled') {
        const { success, result } = promiseResult.value;
        results.push(result);
        
        if (success) {
          executedHooks++;
        } else {
          skippedHooks++;
        }
      } else {
        // Promise was rejected
        skippedHooks++;
        results.push({
          data: initialData,
          modified: false,
          stop: false,
        });
      }
    }

    const totalExecutionTime = Date.now() - startTime;
    const executionResult: HookExecutionResult = {
      success: errors.length === 0,
      results,
      errors,
      totalExecutionTime,
      executedHooks,
      skippedHooks
    };

    this.logger.debug(`Parallel hook execution completed in ${totalExecutionTime}ms. Executed: ${executedHooks}, Errors: ${errors.length}`);
    this.emit('hooks-complete', { hookName, result: executionResult, context });

    return executionResult;
  }

  /**
   * Execute a single hook with timeout protection
   */
  private async executeHookWithTimeout(
    registration: HookRegistration,
    data: any,
    context: HookContext,
    timeout: number
  ): Promise<HookResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Hook execution timeout after ${timeout}ms`));
      }, timeout);

      try {
        const result = registration.callback(data, context);

        // Handle both sync and async callbacks
        if (result && typeof result.then === 'function') {
          // Async callback
          result
            .then((hookResult: HookResult) => {
              clearTimeout(timeoutId);
              resolve(hookResult);
            })
            .catch((error: Error) => {
              clearTimeout(timeoutId);
              reject(error);
            });
        } else {
          // Sync callback
          clearTimeout(timeoutId);
          resolve(result as HookResult);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Validate hook result format
   */
  private validateHookResult(result: any): result is HookResult {
    if (!result || typeof result !== 'object') {
      return false;
    }

    // Check required properties
    if (typeof result.modified !== 'boolean' || typeof result.stop !== 'boolean') {
      return false;
    }

    // data can be any type, so no validation needed
    // error is optional
    if (result.error !== undefined && typeof result.error !== 'string') {
      return false;
    }

    return true;
  }

  /**
   * Execute hook with retry logic
   */
  public async executeHookWithRetry(
    registration: HookRegistration,
    data: any,
    context: HookContext,
    maxRetries: number = 3,
    timeout: number = 30000
  ): Promise<HookResult> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        this.logger.debug(`Executing hook attempt ${attempt + 1}/${maxRetries + 1} for plugin ${registration.pluginId}`);
        
        const result = await this.executeHookWithTimeout(registration, data, context, timeout);
        
        if (attempt > 0) {
          this.logger.info(`Hook succeeded on attempt ${attempt + 1} for plugin ${registration.pluginId}`);
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          this.logger.warn(`Hook attempt ${attempt + 1} failed for plugin ${registration.pluginId}, retrying in ${delay}ms:`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Execute hooks with filtering
   */
  public async executeFilteredHooks<K extends keyof PluginHooks>(
    hookName: K,
    hooks: HookRegistration[],
    context: HookContext,
    initialData: any,
    filter: (registration: HookRegistration) => boolean,
    options?: HookExecutionOptions
  ): Promise<HookExecutionResult> {
    const filteredHooks = hooks.filter(filter);
    this.logger.debug(`Filtered ${hooks.length} hooks to ${filteredHooks.length} for ${String(hookName)}`);
    
    return this.executeHooks(hookName, filteredHooks, context, initialData, options);
  }

  /**
   * Get execution statistics
   */
  public getExecutionStats(): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
  } {
    // Implementation would track statistics
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0
    };
  }

  /**
   * Set default execution options
   */
  public setDefaultOptions(options: Partial<HookExecutionOptions>): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
    this.logger.debug('Updated default hook execution options');
  }
}