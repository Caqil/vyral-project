export interface RouteOptions {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  middleware?: string[];
  permission?: string;
}

export function Route(options: RouteOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    if (!target._routes) {
      target._routes = [];
    }

    target._routes.push({
      path: options.path,
      method: options.method || 'GET',
      middleware: options.middleware || [],
      permission: options.permission,
      handler: descriptor.value,
      handlerName: propertyKey
    });

    return descriptor;
  };
}

export function Get(path: string, options: Omit<RouteOptions, 'path' | 'method'> = {}) {
  return Route({ ...options, path, method: 'GET' });
}

export function Post(path: string, options: Omit<RouteOptions, 'path' | 'method'> = {}) {
  return Route({ ...options, path, method: 'POST' });
}

export function Put(path: string, options: Omit<RouteOptions, 'path' | 'method'> = {}) {
  return Route({ ...options, path, method: 'PUT' });
}

export function Delete(path: string, options: Omit<RouteOptions, 'path' | 'method'> = {}) {
  return Route({ ...options, path, method: 'DELETE' });
}