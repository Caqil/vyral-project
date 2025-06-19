// hooks/useModuleMenu.ts
"use client";

import { useState, useEffect } from "react";

export interface ModuleMenuItem {
  id: string;
  name: string;
  href: string;
  icon?: string;
  moduleSlug: string;
  moduleName: string;
  order?: number;
  permission?: string;
  badge?: string | number;
}

export interface ModuleMenuGroup {
  name: string;
  icon?: string;
  items: ModuleMenuItem[];
  order?: number;
}

interface Module {
  _id: string;
  manifest: {
    name: string;
    slug: string;
    version: string;
    icon?: string;
    menuItems?: ModuleMenuItem[];
    menuGroups?: ModuleMenuGroup[];
  };
  status: "active" | "inactive" | "installed" | "error";
  configValues: Record<string, any>;
}

export const useModuleMenu = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveModules = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/modules?status=active');
      const data = await response.json();
      
      if (response.ok) {
        setModules(data.modules || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch modules');
        setModules([]);
      }
    } catch (err) {
      setError('Network error occurred');
      setModules([]);
      console.error('Error fetching modules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveModules();
  }, []);

  // Get all module menu items
  const getModuleMenuItems = (): ModuleMenuItem[] => {
    const items: ModuleMenuItem[] = [];
    
    modules.forEach(module => {
      if (module.status === 'active' && module.manifest.menuItems) {
        items.push(...module.manifest.menuItems);
      }
    });

    return items.sort((a, b) => (a.order || 999) - (b.order || 999));
  };

  // Get module menu groups
  const getModuleMenuGroups = (): ModuleMenuGroup[] => {
    const groups: ModuleMenuGroup[] = [];
    
    modules.forEach(module => {
      if (module.status === 'active' && module.manifest.menuGroups) {
        groups.push(...module.manifest.menuGroups);
      }
    });

    return groups.sort((a, b) => (a.order || 999) - (b.order || 999));
  };

  // Check if user has permission for menu item
  const hasPermission = (permission?: string): boolean => {
    if (!permission) return true;
    // TODO: Implement permission checking with user roles
    // This would integrate with your existing auth system
    return true;
  };

  // Filter menu items by permission
  const getFilteredMenuItems = (): ModuleMenuItem[] => {
    return getModuleMenuItems().filter(item => hasPermission(item.permission));
  };

  // Refresh modules data
  const refresh = () => {
    fetchActiveModules();
  };

  return {
    modules,
    loading,
    error,
    getModuleMenuItems,
    getModuleMenuGroups,
    getFilteredMenuItems,
    hasPermission,
    refresh,
  };
};

// lib/moduleMenuRegistry.ts
interface MenuRegistration {
  moduleSlug: string;
  items: ModuleMenuItem[];
  groups?: ModuleMenuGroup[];
}

class ModuleMenuRegistry {
  private registrations = new Map<string, MenuRegistration>();

  register(moduleSlug: string, items: ModuleMenuItem[], groups?: ModuleMenuGroup[]) {
    this.registrations.set(moduleSlug, {
      moduleSlug,
      items: items.map(item => ({ ...item, moduleSlug })),
      groups,
    });
  }

  unregister(moduleSlug: string) {
    this.registrations.delete(moduleSlug);
  }

  getAllItems(): ModuleMenuItem[] {
    const items: ModuleMenuItem[] = [];
    for (const registration of this.registrations.values()) {
      items.push(...registration.items);
    }
    return items.sort((a, b) => (a.order || 999) - (b.order || 999));
  }

  getAllGroups(): ModuleMenuGroup[] {
    const groups: ModuleMenuGroup[] = [];
    for (const registration of this.registrations.values()) {
      if (registration.groups) {
        groups.push(...registration.groups);
      }
    }
    return groups.sort((a, b) => (a.order || 999) - (b.order || 999));
  }

  getItemsByModule(moduleSlug: string): ModuleMenuItem[] {
    const registration = this.registrations.get(moduleSlug);
    return registration?.items || [];
  }

  clear() {
    this.registrations.clear();
  }
}

export const moduleMenuRegistry = new ModuleMenuRegistry();

// utils/moduleHelpers.ts
export const registerModuleMenuItems = (
  moduleSlug: string,
  items: Omit<ModuleMenuItem, 'moduleSlug'>[]
) => {
  const menuItems = items.map(item => ({
    ...item,
    moduleSlug,
    id: `${moduleSlug}-${item.id}`,
  }));
  
  moduleMenuRegistry.register(moduleSlug, menuItems);
};

export const unregisterModuleMenuItems = (moduleSlug: string) => {
  moduleMenuRegistry.unregister(moduleSlug);
};

// Example usage for module developers:
/*
// In a module file:
import { registerModuleMenuItems } from '@/utils/moduleHelpers';

// Register menu items when module loads
registerModuleMenuItems('my-ecommerce-module', [
  {
    id: 'products',
    name: 'Products',
    href: '/admin/ecommerce/products',
    icon: 'Package',
    order: 1,
    permission: 'ecommerce.manage',
  },
  {
    id: 'orders',
    name: 'Orders',
    href: '/admin/ecommerce/orders',
    icon: 'ShoppingCart',
    order: 2,
    permission: 'ecommerce.orders',
    badge: 5, // number of pending orders
  },
]);
*/

// API utility for managing module menu items
export const moduleMenuApi = {
  // Update module menu items via API
  updateMenuItems: async (moduleSlug: string, items: ModuleMenuItem[]) => {
    try {
      const response = await fetch(`/api/admin/modules/${moduleSlug}/menu`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ menuItems: items }),
      });

      if (!response.ok) {
        throw new Error('Failed to update menu items');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating module menu items:', error);
      throw error;
    }
  },

  // Get module configuration for menu customization
  getModuleConfig: async (moduleSlug: string) => {
    try {
      const response = await fetch(`/api/admin/modules/${moduleSlug}/config`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch module config');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching module config:', error);
      throw error;
    }
  },
};