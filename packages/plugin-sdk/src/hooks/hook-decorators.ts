import { HookPriority } from '../types';

// Decorator for hook registration
export function Hook<K extends string>(
  hookName: K,
  priority: HookPriority = HookPriority.NORMAL
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    if (!target._hooks) {
      target._hooks = [];
    }

    target._hooks.push({
      hookName,
      method: propertyKey,
      priority,
      callback: descriptor.value
    });

    return descriptor;
  };
}

// Decorator for async hooks
export function AsyncHook<K extends string>(
  hookName: K,
  priority: HookPriority = HookPriority.NORMAL
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return await originalMethod.apply(this, args);
    };

    return Hook(hookName, priority)(target, propertyKey, descriptor);
  };
}

// Decorator for conditional hooks
export function ConditionalHook<K extends string>(
  hookName: K,
  condition: (context: any) => boolean,
  priority: HookPriority = HookPriority.NORMAL
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (context: any, ...args: any[]) {
      if (condition(context)) {
        return originalMethod.apply(this, [context, ...args]);
      }
      return null;
    };

    return Hook(hookName, priority)(target, propertyKey, descriptor);
  };
}