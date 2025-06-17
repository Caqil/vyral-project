import { Post, User, Category, Tag, Media, Comment } from '@vyral/core';

// Hook context interface
export interface HookContext {
  pluginId: string;
  timestamp: Date;
  user?: User;
  request?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
  };
}

// Hook result interface
export interface HookResult<T = any> {
  data: T;
  modified: boolean;
  stop: boolean;
  errors?: string[];
}

// Available hooks interface
export interface PluginHooks {
  // Content hooks
  'content:before-create': (data: Partial<Post>, context: HookContext) => Promise<HookResult<Partial<Post>>>;
  'content:after-create': (post: Post, context: HookContext) => Promise<void>;
  'content:before-update': (id: string, data: Partial<Post>, context: HookContext) => Promise<HookResult<Partial<Post>>>;
  'content:after-update': (post: Post, context: HookContext) => Promise<void>;
  'content:before-delete': (id: string, context: HookContext) => Promise<HookResult<boolean>>;
  'content:after-delete': (id: string, context: HookContext) => Promise<void>;
  'content:before-render': (post: Post, context: HookContext) => Promise<HookResult<Post>>;
  'content:after-render': (html: string, post: Post, context: HookContext) => Promise<HookResult<string>>;
  
  // User hooks
  'user:before-create': (data: Partial<User>, context: HookContext) => Promise<HookResult<Partial<User>>>;
  'user:after-create': (user: User, context: HookContext) => Promise<void>;
  'user:before-login': (credentials: any, context: HookContext) => Promise<HookResult<any>>;
  'user:after-login': (user: User, context: HookContext) => Promise<void>;
  'user:before-logout': (user: User, context: HookContext) => Promise<void>;
  'user:after-logout': (userId: string, context: HookContext) => Promise<void>;
  
  // Comment hooks
  'comment:before-create': (data: Partial<Comment>, context: HookContext) => Promise<HookResult<Partial<Comment>>>;
  'comment:after-create': (comment: Comment, context: HookContext) => Promise<void>;
  'comment:before-approve': (id: string, context: HookContext) => Promise<HookResult<boolean>>;
  'comment:after-approve': (comment: Comment, context: HookContext) => Promise<void>;
  
  // Media hooks
  'media:before-upload': (file: File, context: HookContext) => Promise<HookResult<File>>;
  'media:after-upload': (media: Media, context: HookContext) => Promise<void>;
  'media:before-delete': (id: string, context: HookContext) => Promise<HookResult<boolean>>;
  'media:after-delete': (id: string, context: HookContext) => Promise<void>;
  
  // Admin hooks
  'admin:menu': (menu: any[], context: HookContext) => Promise<HookResult<any[]>>;
  'admin:dashboard-widgets': (widgets: any[], context: HookContext) => Promise<HookResult<any[]>>;
  'admin:settings-tabs': (tabs: any[], context: HookContext) => Promise<HookResult<any[]>>;
  
  // Frontend hooks
  'frontend:head': (head: string, context: HookContext) => Promise<HookResult<string>>;
  'frontend:footer': (footer: string, context: HookContext) => Promise<HookResult<string>>;
  'frontend:sidebar': (sidebar: string, context: HookContext) => Promise<HookResult<string>>;
  
  // API hooks
  'api:before-request': (request: any, context: HookContext) => Promise<HookResult<any>>;
  'api:after-response': (response: any, context: HookContext) => Promise<HookResult<any>>;
  'api:error': (error: Error, context: HookContext) => Promise<void>;
  
  // Plugin hooks
  'plugin:before-activate': (pluginId: string, context: HookContext) => Promise<HookResult<boolean>>;
  'plugin:after-activate': (pluginId: string, context: HookContext) => Promise<void>;
  'plugin:before-deactivate': (pluginId: string, context: HookContext) => Promise<HookResult<boolean>>;
  'plugin:after-deactivate': (pluginId: string, context: HookContext) => Promise<void>;
  
  // Theme hooks
  'theme:before-switch': (themeId: string, context: HookContext) => Promise<HookResult<boolean>>;
  'theme:after-switch': (themeId: string, context: HookContext) => Promise<void>;
  
  // System hooks
  'system:startup': (context: HookContext) => Promise<void>;
  'system:shutdown': (context: HookContext) => Promise<void>;
  'system:maintenance-mode': (enabled: boolean, context: HookContext) => Promise<void>;
}

// Hook priority levels
export enum HookPriority {
  HIGHEST = 1,
  HIGH = 5,
  NORMAL = 10,
  LOW = 15,
  LOWEST = 20
}

// Hook registration interface
export interface HookRegistration {
  hook: keyof PluginHooks;
  callback: Function;
  priority: HookPriority;
  pluginId: string;
}
