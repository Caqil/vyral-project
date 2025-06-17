import { EventEmitter } from 'events';
import { PluginEvent, EventListener, EventCallback, EventFilter, EventSubscription, EventMetrics, EventPriority } from './event-types';
import { Logger } from '@vyral/core';

export class EventManager extends EventEmitter {
  private eventListeners: Map<string, EventListener[]> = new Map();
  private eventHistory: PluginEvent[] = [];
  private metrics: EventMetrics = {
    totalEvents: 0,
    eventsPerType: {},
    eventsPerPlugin: {},
    averageProcessingTime: 0,
    errorRate: 0
  };
  private logger: Logger;
  private maxHistorySize: number = 1000;
  private processingTimes: number[] = [];

  constructor() {
    super();
    this.logger = new Logger('EventManager');
    this.setMaxListeners(0); // Remove limit
  }

  /**
   * Emit an event to all registered listeners
   */
  public async emitEvent(type: string, data: any, source: string = 'system', metadata?: Record<string, any>): Promise<void> {
    const startTime = Date.now();
    
    const event: PluginEvent = {
      id: this.generateEventId(),
      type,
      source,
      data,
      timestamp: new Date(),
      metadata
    };

    this.logger.debug(`Emitting event: ${type} from ${source}`);
    
    try {
      // Add to history
      this.addToHistory(event);
      
      // Update metrics
      this.updateMetrics(event);
      
      // Get listeners for this event type
      const listeners = this.getListenersForEvent(type);
      
      if (listeners.length === 0) {
        this.logger.debug(`No listeners for event: ${type}`);
        return;
      }

      // Sort listeners by priority (highest first)
      const sortedListeners = [...listeners].sort((a, b) => b.priority - a.priority);
      
      // Execute listeners
      const promises = sortedListeners.map(listener => this.executeListener(listener, event));
      await Promise.allSettled(promises);
      
      // Emit on EventEmitter for backward compatibility
      this.emit(type, event);
      
      const processingTime = Date.now() - startTime;
      this.processingTimes.push(processingTime);
      
      // Keep only last 100 processing times for average calculation
      if (this.processingTimes.length > 100) {
        this.processingTimes.shift();
      }
      
      this.logger.debug(`Event ${type} processed in ${processingTime}ms`);
      
    } catch (error) {
      this.logger.error(`Error emitting event ${type}:`, error);
      this.metrics.errorRate = (this.metrics.errorRate * 0.9) + (0.1 * 1); // Moving average
      throw error;
    }
  }

  /**
   * Register an event listener
   */
  public addEventListener(
    event: string,
    callback: EventCallback,
    pluginId: string,
    options: {
      priority?: number;
      once?: boolean;
      filter?: EventFilter;
    } = {}
  ): EventSubscription {
    const listener: EventListener = {
      id: this.generateListenerId(),
      event,
      callback,
      pluginId,
      priority: options.priority ?? EventPriority.NORMAL,
      once: options.once ?? false,
      filter: options.filter,
      createdAt: new Date()
    };

    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }

    this.eventListeners.get(event)!.push(listener);
    
    this.logger.debug(`Added event listener for ${event} from plugin ${pluginId}`);
    
    const subscription: EventSubscription = {
      id: listener.id,
      event,
      pluginId,
      active: true,
      unsubscribe: () => this.removeEventListener(listener.id)
    };

    return subscription;
  }

  /**
   * Remove an event listener
   */
  public removeEventListener(listenerId: string): boolean {
    for (const [event, listeners] of this.eventListeners.entries()) {
      const index = listeners.findIndex(l => l.id === listenerId);
      if (index !== -1) {
        const listener = listeners[index];
        listeners.splice(index, 1);
        
        this.logger.debug(`Removed event listener ${listenerId} for ${event} from plugin ${listener.pluginId}`);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Remove all listeners for a plugin
   */
  public removePluginListeners(pluginId: string): number {
    let removedCount = 0;
    
    for (const [event, listeners] of this.eventListeners.entries()) {
      const initialLength = listeners.length;
      this.eventListeners.set(event, listeners.filter(l => l.pluginId !== pluginId));
      removedCount += initialLength - listeners.length;
    }
    
    this.logger.debug(`Removed ${removedCount} event listeners for plugin ${pluginId}`);
    return removedCount;
  }

  /**
   * Get all listeners for an event
   */
  private getListenersForEvent(event: string): EventListener[] {
    const directListeners = this.eventListeners.get(event) || [];
    const wildcardListeners = this.eventListeners.get('*') || [];
    
    return [...directListeners, ...wildcardListeners];
  }

  /**
   * Execute a single listener
   */
  private async executeListener(listener: EventListener, event: PluginEvent): Promise<void> {
    try {
      // Apply filter if present
      if (listener.filter) {
        const shouldProcess = await listener.filter(event);
        if (!shouldProcess) {
          return;
        }
      }

      // Execute callback
      await listener.callback(event);
      
      // Remove listener if it's a one-time listener
      if (listener.once) {
        this.removeEventListener(listener.id);
      }
      
    } catch (error) {
      this.logger.error(`Error executing event listener ${listener.id} for ${event.type}:`, error);
      
      // Emit error event
      this.emitEvent('system:listener-error', {
        listenerId: listener.id,
        pluginId: listener.pluginId,
        event: event.type,
        error: error instanceof Error ? error.message : String(error)
      }, 'event-manager');
    }
  }

  /**
   * Get event history
   */
  public getEventHistory(filter?: {
    type?: string;
    source?: string;
    since?: Date;
    limit?: number;
  }): PluginEvent[] {
    let events = [...this.eventHistory];
    
    if (filter) {
      if (filter.type) {
        events = events.filter(e => e.type === filter.type);
      }
      
      if (filter.source) {
        events = events.filter(e => e.source === filter.source);
      }
      
      if (filter.since) {
        events = events.filter(e => e.timestamp >= filter.since!);
      }
      
      if (filter.limit) {
        events = events.slice(-filter.limit);
      }
    }
    
    return events.reverse(); // Most recent first
  }

  /**
   * Get event metrics
   */
  public getMetrics(): EventMetrics {
    // Update average processing time
    if (this.processingTimes.length > 0) {
      this.metrics.averageProcessingTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
    }
    
    return { ...this.metrics };
  }

  /**
   * Get listeners information
   */
  public getListenersInfo(): Array<{
    event: string;
    pluginId: string;
    priority: number;
    once: boolean;
    hasFilter: boolean;
  }> {
    const info: Array<{
      event: string;
      pluginId: string;
      priority: number;
      once: boolean;
      hasFilter: boolean;
    }> = [];

    for (const [event, listeners] of this.eventListeners.entries()) {
      for (const listener of listeners) {
        info.push({
          event,
          pluginId: listener.pluginId,
          priority: listener.priority,
          once: listener.once,
          hasFilter: !!listener.filter
        });
      }
    }

    return info.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Clear event history
   */
  public clearHistory(): void {
    this.eventHistory = [];
    this.logger.debug('Event history cleared');
  }

  /**
   * Clear all listeners
   */
  public clearAllListeners(): void {
    this.eventListeners.clear();
    this.removeAllListeners(); // EventEmitter method
    this.logger.debug('All event listeners cleared');
  }

  /**
   * Set maximum history size
   */
  public setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
    
    // Trim current history if needed
    if (this.eventHistory.length > size) {
      this.eventHistory = this.eventHistory.slice(-size);
    }
  }

  private addToHistory(event: PluginEvent): void {
    this.eventHistory.push(event);
    
    // Trim history if it exceeds max size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  private updateMetrics(event: PluginEvent): void {
    this.metrics.totalEvents++;
    
    // Update events per type
    if (!this.metrics.eventsPerType[event.type]) {
      this.metrics.eventsPerType[event.type] = 0;
    }
    this.metrics.eventsPerType[event.type]++;
    
    // Update events per plugin
    if (!this.metrics.eventsPerPlugin[event.source]) {
      this.metrics.eventsPerPlugin[event.source] = 0;
    }
    this.metrics.eventsPerPlugin[event.source]++;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateListenerId(): string {
    return `lsn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}