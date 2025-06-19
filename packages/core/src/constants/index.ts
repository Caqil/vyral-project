export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 10,
  maxLimit: 100
} as const;

export const CACHE_KEYS = {
  POST: (id: string) => `post:${id}`,
  POST_LIST: (params: string) => `posts:${params}`,
  CATEGORY: (id: string) => `category:${id}`,
  TAG: (id: string) => `tag:${id}`,
  USER: (id: string) => `user:${id}`,
  SETTINGS: 'settings',
  NAVIGATION: (location: string) => `navigation:${location}`
} as const;

export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400 // 24 hours
} as const;

export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES: 10,
  ALLOWED_EXTENSIONS: [
    // Images
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
    // Documents
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    // Archives
    'zip', 'rar', '7z',
    // Audio
    'mp3', 'wav', 'ogg',
    // Video
    'mp4', 'avi', 'mov', 'wmv', 'flv'
  ]
} as const;

export const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150 },
  small: { width: 300, height: 300 },
  medium: { width: 600, height: 400 },
  large: { width: 1200, height: 800 },
  xl: { width: 1920, height: 1080 }
} as const;

export const USER_PERMISSIONS = {
  // Content permissions
  'content.create': 'Create content',
  'content.read': 'Read content',
  'content.update': 'Update content',
  'content.delete': 'Delete content',
  'content.publish': 'Publish content',
  
  // User permissions
  'users.create': 'Create users',
  'users.read': 'Read users',
  'users.update': 'Update users',
  'users.delete': 'Delete users',
  
  // Media permissions
  'media.upload': 'Upload media',
  'media.delete': 'Delete media',
  'media.manage': 'Manage media library',
  
  // System permissions
  'settings.read': 'Read settings',
  'settings.update': 'Update settings',
  'plugins.manage': 'Manage plugins',
  'themes.manage': 'Manage themes',
  'system.backup': 'Create backups'
} as const;

export const ROLE_PERMISSIONS = {
  super_admin: Object.keys(USER_PERMISSIONS),
  admin: [
    'content.create', 'content.read', 'content.update', 'content.delete', 'content.publish',
    'users.create', 'users.read', 'users.update', 'users.delete',
    'media.upload', 'media.delete', 'media.manage',
    'settings.read', 'settings.update',
    'plugins.manage'
  ],
  editor: [
    'content.create', 'content.read', 'content.update', 'content.delete', 'content.publish',
    'users.read',
    'media.upload', 'media.delete', 'media.manage'
  ],
  author: [
    'content.create', 'content.read', 'content.update', 'content.publish',
    'media.upload'
  ],
  contributor: [
    'content.create', 'content.read', 'content.update',
    'media.upload'
  ],
  subscriber: [
    'content.read'
  ]
} as const;
