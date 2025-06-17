import { EventManager } from "../events/event-manager";

class PluginEventBus extends EventManager {
  private static instance: PluginEventBus;

  private constructor() {
    super();
  }

  public static getInstance(): PluginEventBus {
    if (!PluginEventBus.instance) {
      PluginEventBus.instance = new PluginEventBus();
    }
    return PluginEventBus.instance;
  }

  // Override emit to match EventManager's expected signature
  public emit<K>(eventName: string | symbol, ...args: any[]): boolean {
    const [data, metadata] = args;
    
    // Call the parent's emitEvent method asynchronously
    this.emitEvent(eventName as string, data, 'plugin', metadata).catch(error => {
      // Since logger is private, we'll use console.error
      console.error('Error in PluginEventBus emit:', error);
    });
    
    // Return true to indicate the event was processed (EventEmitter contract)
    return true;
  }

  // Override on to match EventManager's expected signature and return this for chaining
  public on<K>(eventName: string | symbol, listener: (...args: any[]) => void): this {
    this.addEventListener(eventName as string, listener, 'unknown', { priority: 50 });
    return this; // Return this for method chaining
  }

  // Implement off method with proper return type for chaining
  public off(event: string, listener: Function): this {
    // Find and remove the specific listener
    // Since we don't have full access to the internal structure,
    // we'll try to use the listeners function if available
    try {
      if (typeof this.listeners === 'function') {
        const listeners = this.listeners(event);
        if (listeners && Array.isArray(listeners)) {
          const listenerObj = listeners.find((l: any) => l.callback === listener);
          if (listenerObj && listenerObj.name) {
            this.removeEventListener(listenerObj.name);
          }
        }
      }
    } catch (error) {
      // Silently handle cases where the method might not work as expected
      console.warn('Could not remove listener from event:', event, error);
    }
    return this; // Return this for method chaining
  }

  // Implement once method with proper return type for chaining
  public once(event: string, listener: Function): this {
    this.addEventListener(event, listener as any, 'unknown', { once: true, priority: 50 });
    return this; // Return this for method chaining
  }

  // Additional helper methods that provide a cleaner API
  public emitSync(event: string, ...args: any[]): void {
    this.emit(event, ...args);
  }

  public addListener(event: string, listener: (...args: any[]) => void): this {
    return this.on(event, listener);
  }

  public removeListener(event: string, listener: Function): this {
    return this.off(event, listener);
  }

  public addOnceListener(event: string, listener: Function): this {
    return this.once(event, listener);
  }

  // Simple method to check if event has listeners (best effort)
  public hasListeners(event: string): boolean {
    try {
      if (typeof this.listeners === 'function') {
        const listeners = this.listeners(event);
        return listeners && Array.isArray(listeners) && listeners.length > 0;
      }
    } catch (error) {
      // Ignore errors and return false
    }
    return false;
  }

  // Get listener count for an event (best effort)
  public listenerCount(event: string): number {
    try {
      if (typeof this.listeners === 'function') {
        const listeners = this.listeners(event);
        return listeners && Array.isArray(listeners) ? listeners.length : 0;
      }
    } catch (error) {
      // Ignore errors and return 0
    }
    return 0;
  }
}

export const eventBus = PluginEventBus.getInstance();