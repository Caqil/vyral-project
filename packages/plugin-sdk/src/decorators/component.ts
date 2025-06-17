import { ComponentType } from 'react';

export interface ComponentOptions {
  name?: string;
  type?: 'admin-page' | 'widget' | 'shortcode' | 'block' | 'custom';
  icon?: string;
  description?: string;
}

export function Component(options: ComponentOptions = {}) {
  return function <T extends ComponentType<any>>(target: T): T {
    if (!target.prototype._components) {
      target.prototype._components = [];
    }

    target.prototype._components.push({
      name: options.name || target.name,
      type: options.type || 'custom',
      icon: options.icon,
      description: options.description,
      component: target
    });

    return target;
  };
}

export function AdminPage(options: { title: string; slug: string; icon?: string; parent?: string }) {
  return Component({
    name: options.slug,
    type: 'admin-page',
    icon: options.icon,
    description: options.title
  });
}

export function Widget(options: { title: string; description?: string; icon?: string }) {
  return Component({
    name: options.title.toLowerCase().replace(/\s+/g, '-'),
    type: 'widget',
    icon: options.icon,
    description: options.description
  });
}

export function Shortcode(options: { tag: string; description?: string }) {
  return Component({
    name: options.tag,
    type: 'shortcode',
    description: options.description
  });
}
