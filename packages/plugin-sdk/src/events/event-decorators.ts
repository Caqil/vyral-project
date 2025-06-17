import { eventBus } from './event-bus';
import { EventPriority } from './event-types';

/**
 * Decorator to automatically register event listeners
 */
export function EventListener(event: string, priority: number = EventPriority.NORMAL) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    // Store the event registration for later use
    if (!target._eventRegistrations) {
      target._eventRegistrations = [];
    }

    target._eventRegistrations.push({
      event,
      method: propertyKey,
      priority,
      callback: originalMethod
    });

    return descriptor;
  };
}

/**
 * Decorator to emit events after method execution
 */
export function EmitEvent(event: string, dataExtractor?: (result: any, args: any[]) => any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);
      
      const eventData = dataExtractor ? dataExtractor(result, args) : { result, args };
      const pluginId = (this as any).config?.name || this.constructor.name;
      
      eventBus.emitEvent(event, eventData, pluginId).catch(error => {
        console.error(`Error emitting event ${event}:`, error);
      });

      return result;
    };

    return descriptor;
  };
}

/**
 * Decorator to register conditional event listeners
 */
export function ConditionalEventListener(
  event: string, 
  condition: (event: any) => boolean,
  priority: number = EventPriority.NORMAL
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    if (!target._eventRegistrations) {
      target._eventRegistrations = [];
    }

    target._eventRegistrations.push({
      event,
      method: propertyKey,
      priority,
      callback: originalMethod,
      filter: condition
    });

    return descriptor;
  };
}

/**
 * Decorator to automatically register and unregister events with plugin lifecycle
 */
export function AutoEventManager(target: any) {
  const originalActivate = target.prototype.activate;
  const originalDeactivate = target.prototype.deactivate;

  target.prototype.activate = async function (...args: any[]) {
    // Register event listeners
    if (this._eventRegistrations) {
      this._eventSubscriptions = this._eventRegistrations.map((reg: any) => {
        return eventBus.addEventListener(
          reg.event,
          reg.callback.bind(this),
          this.config?.name || this.constructor.name,
          {
            priority: reg.priority,
            filter: reg.filter
          }
        );
      });
    }

    // Call original activate
    if (originalActivate) {
      return await originalActivate.apply(this, args);
    }
  };

  target.prototype.deactivate = async function (...args: any[]) {
    // Unregister event listeners
    if (this._eventSubscriptions) {
      this._eventSubscriptions.forEach((subscription: any) => {
        subscription.unsubscribe();
      });
      this._eventSubscriptions = [];
    }

    // Call original deactivate
    if (originalDeactivate) {
      return await originalDeactivate.apply(this, args);
    }
  };

  return target;
}