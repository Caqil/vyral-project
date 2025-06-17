export interface PluginEvent {
  id: string;
  type: string;
  source: string;
  data: any;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface EventListener {
  id: string;
  event: string;
  callback: EventCallback;
  pluginId: string;
  priority: number;
  once: boolean;
  filter?: EventFilter;
  createdAt: Date;
}

export type EventCallback = (event: PluginEvent) => void | Promise<void>;
export type EventFilter = (event: PluginEvent) => boolean | Promise<boolean>;

export interface EventSubscription {
  id: string;
  event: string;
  pluginId: string;
  active: boolean;
  unsubscribe: () => void;
}

export interface EventMetrics {
  totalEvents: number;
  eventsPerType: Record<string, number>;
  eventsPerPlugin: Record<string, number>;
  averageProcessingTime: number;
  errorRate: number;
}

export enum EventPriority {
  LOWEST = 0,
  LOW = 25,
  NORMAL = 50,
  HIGH = 75,
  HIGHEST = 100
}

// System Events
export interface SystemEvents {
  'system:startup': { timestamp: Date; version: string };
  'system:shutdown': { timestamp: Date; graceful: boolean };
  'system:error': { error: Error; context?: any };
  'system:config-changed': { key: string; oldValue: any; newValue: any };
  'system:maintenance': { mode: 'start' | 'end' };
}

// Plugin Events
export interface PluginEvents {
  'plugin:installed': { pluginId: string; version: string };
  'plugin:activated': { pluginId: string };
  'plugin:deactivated': { pluginId: string };
  'plugin:uninstalled': { pluginId: string };
  'plugin:error': { pluginId: string; error: Error };
  'plugin:updated': { pluginId: string; oldVersion: string; newVersion: string };
}

// Content Events
export interface ContentEvents {
  'content:created': { type: string; id: string; data: any };
  'content:updated': { type: string; id: string; changes: any; oldData: any; newData: any };
  'content:deleted': { type: string; id: string; data: any };
  'content:published': { type: string; id: string; data: any };
  'content:unpublished': { type: string; id: string; data: any };
  'content:viewed': { type: string; id: string; userId?: string; ip?: string };
}

// User Events
export interface UserEvents {
  'user:registered': { userId: string; userData: any };
  'user:login': { userId: string; ip?: string; userAgent?: string };
  'user:logout': { userId: string; sessionId?: string };
  'user:updated': { userId: string; changes: any };
  'user:deleted': { userId: string; userData: any };
  'user:role-assigned': { userId: string; roleId: string };
  'user:role-removed': { userId: string; roleId: string };
}

// Media Events
export interface MediaEvents {
  'media:uploaded': { mediaId: string; filename: string; size: number; type: string };
  'media:deleted': { mediaId: string; filename: string };
  'media:optimized': { mediaId: string; originalSize: number; newSize: number };
}

// All Events Union
export type AllEvents = SystemEvents & PluginEvents & ContentEvents & UserEvents & MediaEvents;
