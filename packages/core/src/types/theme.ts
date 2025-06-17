import { z } from 'zod';
import { BaseEntity, Metadata } from './core';

// Theme Status
export const ThemeStatus = {
  INACTIVE: 'inactive',
  ACTIVE: 'active',
  ERROR: 'error',
  UPDATING: 'updating',
  INSTALLING: 'installing'
} as const;

export type ThemeStatusType = typeof ThemeStatus[keyof typeof ThemeStatus];

// Theme Types
export interface Theme extends BaseEntity {
  name: string;
  slug: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords: string[];
  status: ThemeStatusType;
  isDefault: boolean;
  configPath: string;
  previewImage?: string;
  screenshots: string[];
  vyralVersion: string;
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  templates: ThemeTemplate[];
  settings: ThemeSetting[];
  customizer: ThemeCustomizer[];
  assets: ThemeAsset[];
  colors: ThemeColorPalette;
  typography: ThemeTypography;
  layout: ThemeLayout;
  breakpoints: ThemeBreakpoints;
  animations: ThemeAnimations;
  installSource: 'registry' | 'upload' | 'git' | 'local';
  installPath: string;
  activatedAt?: Date;
  lastUpdate?: Date;
  updateAvailable?: string;
  errorMessage?: string;
  metadata: Metadata;
}

export interface ThemeTemplate {
  name: string;
  file: string;
  type: 'page' | 'post' | 'archive' | 'category' | 'tag' | 'author' | 'search' | 'error' | 'custom';
  description?: string;
  preview?: string;
  supports?: string[];
  conditions?: {
    postType?: string[];
    taxonomy?: string[];
    template?: string[];
    user?: {
      roles?: string[];
      capabilities?: string[];
    };
  };
  customFields?: ThemeCustomField[];
}

export interface ThemeCustomField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number' | 'date' | 'color' | 'image' | 'file' | 'repeater';
  description?: string;
  placeholder?: string;
  default?: any;
  required?: boolean;
  options?: Array<{ label: string; value: any }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: string;
  };
  conditional?: {
    field: string;
    value: any;
    operator?: 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in';
  };
}

export interface ThemeSetting {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'color' | 'image' | 'font' | 'spacing' | 'border' | 'shadow';
  default?: any;
  options?: Array<{ label: string; value: any }>;
  description?: string;
  section: string;
  group?: string;
  order?: number;
  transport?: 'refresh' | 'postMessage';
  sanitize?: string;
  validate?: string;
  conditional?: {
    setting: string;
    value: any;
    operator?: 'equals' | 'not_equals' | 'contains';
  };
}

export interface ThemeCustomizer {
  panel: string;
  title: string;
  description?: string;
  priority?: number;
  sections: ThemeCustomizerSection[];
}

export interface ThemeCustomizerSection {
  id: string;
  title: string;
  description?: string;
  priority?: number;
  controls: ThemeCustomizerControl[];
}

export interface ThemeCustomizerControl {
  setting: string;
  type: 'text' | 'textarea' | 'number' | 'checkbox' | 'radio' | 'select' | 'color' | 'image' | 'range';
  label: string;
  description?: string;
  default?: any;
  choices?: Record<string, string>;
  input_attrs?: Record<string, any>;
  transport?: 'refresh' | 'postMessage';
  sanitize_callback?: string;
  sanitize_js_callback?: string;
}

export interface ThemeAsset {
  type: 'css' | 'js' | 'font' | 'image';
  file: string;
  handle?: string;
  dependencies?: string[];
  version?: string;
  media?: string;
  condition?: string;
  priority?: number;
  async?: boolean;
  defer?: boolean;
  preload?: boolean;
  crossorigin?: 'anonymous' | 'use-credentials';
  integrity?: string;
}

export interface ThemeColorPalette {
  primary: ThemeColor;
  secondary: ThemeColor;
  accent: ThemeColor;
  neutral: ThemeColor;
  success: ThemeColor;
  warning: ThemeColor;
  error: ThemeColor;
  info: ThemeColor;
  background: ThemeColor;
  surface: ThemeColor;
  text: ThemeColor;
  border: ThemeColor;
  custom?: Record<string, ThemeColor>;
}

export interface ThemeColor {
  50?: string;
  100?: string;
  200?: string;
  300?: string;
  400?: string;
  500: string; // Base color
  600?: string;
  700?: string;
  800?: string;
  900?: string;
  950?: string;
  DEFAULT?: string;
  foreground?: string;
}

export interface ThemeTypography {
  fontFamilies: {
    sans: string[];
    serif: string[];
    mono: string[];
    display?: string[];
    body?: string[];
    custom?: Record<string, string[]>;
  };
  fontSizes: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
    '6xl': string;
    '7xl': string;
    '8xl': string;
    '9xl': string;
    custom?: Record<string, string>;
  };
  fontWeights: {
    thin: number;
    extralight: number;
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
    extrabold: number;
    black: number;
    custom?: Record<string, number>;
  };
  lineHeights: {
    none: number;
    tight: number;
    snug: number;
    normal: number;
    relaxed: number;
    loose: number;
    custom?: Record<string, number>;
  };
  letterSpacing: {
    tighter: string;
    tight: string;
    normal: string;
    wide: string;
    wider: string;
    widest: string;
    custom?: Record<string, string>;
  };
}

export interface ThemeLayout {
  container: {
    center: boolean;
    padding: string | Record<string, string>;
    screens: Record<string, string>;
  };
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  borderWidth: Record<string, string>;
  boxShadow: Record<string, string>;
  zIndex: Record<string, number>;
  opacity: Record<string, string>;
}

export interface ThemeBreakpoints {
  xs?: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  custom?: Record<string, string>;
}

export interface ThemeAnimations {
  keyframes: Record<string, Record<string, Record<string, string>>>;
  animation: Record<string, string>;
  transitionProperty: Record<string, string>;
  transitionTimingFunction: Record<string, string>;
  transitionDuration: Record<string, string>;
  transitionDelay: Record<string, string>;
}

export interface ThemeManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  screenshot?: string;
  tags?: string[];
  vyralVersion: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  templates: ThemeTemplate[];
  settings?: ThemeSetting[];
  customizer?: ThemeCustomizer[];
  assets?: ThemeAsset[];
  colors?: Partial<ThemeColorPalette>;
  typography?: Partial<ThemeTypography>;
  layout?: Partial<ThemeLayout>;
  breakpoints?: Partial<ThemeBreakpoints>;
  animations?: Partial<ThemeAnimations>;
  support?: {
    customLogo?: boolean;
    customHeader?: boolean;
    customBackground?: boolean;
    customColors?: boolean;
    customizer?: boolean;
    widgets?: boolean;
    menus?: boolean;
    postThumbnails?: boolean;
    postFormats?: string[];
    html5?: string[];
    titleTag?: boolean;
    automaticFeed?: boolean;
    responsiveEmbeds?: boolean;
    blockTemplates?: boolean;
    wideBlocks?: boolean;
    alignWide?: boolean;
    alignFull?: boolean;
    editorStyles?: boolean;
    darkMode?: boolean;
  };
  textdomain?: string;
  domainPath?: string;
  requiresPlugins?: string[];
  testedUpTo?: string;
  requiresWP?: string;
  network?: boolean;
}

export interface ThemeRegistry {
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  downloadUrl: string;
  downloadCount: number;
  rating: number;
  ratingCount: number;
  size: number;
  lastUpdated: Date;
  tags: string[];
  screenshots: string[];
  demoUrl?: string;
  compatibility: string[];
  changelog: Array<{
    version: string;
    date: Date;
    changes: string[];
    breaking?: boolean;
  }>;
  verified: boolean;
  featured: boolean;
  category: string;
  subcategory?: string;
  minVyralVersion: string;
  maxVyralVersion?: string;
  price?: {
    amount: number;
    currency: string;
    type: 'one-time' | 'subscription';
  };
  license: {
    type: 'free' | 'commercial' | 'gpl' | 'mit' | 'custom';
    url?: string;
  };
}

export interface ThemeInstallation {
  themeId: string;
  source: 'registry' | 'upload' | 'git' | 'local';
  version: string;
  installPath: string;
  installedAt: Date;
  installedBy: string;
  config: ThemeManifest;
  files: Array<{
    path: string;
    size: number;
    hash: string;
  }>;
  dependencies: string[];
  customizations?: Record<string, any>;
  parentTheme?: string;
  childTheme?: boolean;
}

export interface ThemeCustomization {
  themeId: string;
  setting: string;
  value: any;
  type: 'theme_mod' | 'option' | 'css' | 'js';
  customizedAt: Date;
  customizedBy: string;
  preview?: boolean;
}

export interface ThemeAnalytics {
  themeId: string;
  metric: string;
  value: number;
  dimensions?: Record<string, string>;
  timestamp: Date;
  period: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

// Validation Schemas
export const ThemeTemplateSchema = z.object({
  name: z.string().min(1),
  file: z.string().min(1),
  type: z.enum(['page', 'post', 'archive', 'category', 'tag', 'author', 'search', 'error', 'custom']),
  description: z.string().optional(),
  preview: z.string().url().optional(),
  supports: z.array(z.string()).optional(),
  conditions: z.object({
    postType: z.array(z.string()).optional(),
    taxonomy: z.array(z.string()).optional(),
    template: z.array(z.string()).optional(),
    user: z.object({
      roles: z.array(z.string()).optional(),
      capabilities: z.array(z.string()).optional()
    }).optional()
  }).optional()
});

export const ThemeSettingSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'textarea', 'number', 'boolean', 'select', 'color', 'image', 'font', 'spacing', 'border', 'shadow']),
  default: z.any().optional(),
  options: z.array(z.object({
    label: z.string(),
    value: z.any()
  })).optional(),
  description: z.string().optional(),
  section: z.string().min(1),
  group: z.string().optional(),
  order: z.number().optional(),
  transport: z.enum(['refresh', 'postMessage']).optional(),
  sanitize: z.string().optional(),
  validate: z.string().optional(),
  conditional: z.object({
    setting: z.string(),
    value: z.any(),
    operator: z.enum(['equals', 'not_equals', 'contains']).optional()
  }).optional()
});

export const ThemeAssetSchema = z.object({
  type: z.enum(['css', 'js', 'font', 'image']),
  file: z.string().min(1),
  handle: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  version: z.string().optional(),
  media: z.string().optional(),
  condition: z.string().optional(),
  priority: z.number().optional(),
  async: z.boolean().optional(),
  defer: z.boolean().optional(),
  preload: z.boolean().optional(),
  crossorigin: z.enum(['anonymous', 'use-credentials']).optional(),
  integrity: z.string().optional()
});

export const ThemeColorSchema = z.object({
  50: z.string().optional(),
  100: z.string().optional(),
  200: z.string().optional(),
  300: z.string().optional(),
  400: z.string().optional(),
  500: z.string(), // Required base color
  600: z.string().optional(),
  700: z.string().optional(),
  800: z.string().optional(),
  900: z.string().optional(),
  950: z.string().optional(),
  DEFAULT: z.string().optional(),
  foreground: z.string().optional()
});

export const ThemeManifestSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Theme name must be lowercase with hyphens'),
  version: z.string().regex(/^\d+\.\d+\.\d+(-[\w\d\-+.]+)?$/, 'Version must follow semver format'),
  description: z.string().min(1).max(500),
  author: z.string().min(1),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  license: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  screenshot: z.string().optional(),
  tags: z.array(z.string()).optional(),
  vyralVersion: z.string().regex(/^[\^~]?\d+\.\d+\.\d+$/, 'Invalid Vyral version constraint'),
  dependencies: z.record(z.string()).optional(),
  peerDependencies: z.record(z.string()).optional(),
  templates: z.array(ThemeTemplateSchema),
  settings: z.array(ThemeSettingSchema).optional(),
  assets: z.array(ThemeAssetSchema).optional(),
  textdomain: z.string().optional(),
  domainPath: z.string().optional(),
  requiresPlugins: z.array(z.string()).optional(),
  testedUpTo: z.string().optional(),
  requiresWP: z.string().optional(),
  network: z.boolean().optional()
});

export const ThemeSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  version: z.string(),
  description: z.string(),
  author: z.string(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  license: z.string().optional(),
  keywords: z.array(z.string()),
  status: z.enum(['inactive', 'active', 'error', 'updating', 'installing']),
  isDefault: z.boolean().default(false),
  configPath: z.string(),
  previewImage: z.string().optional(),
  screenshots: z.array(z.string()),
  vyralVersion: z.string(),
  dependencies: z.record(z.string()),
  peerDependencies: z.record(z.string()),
  templates: z.array(ThemeTemplateSchema),
  settings: z.array(ThemeSettingSchema),
  assets: z.array(ThemeAssetSchema),
  installSource: z.enum(['registry', 'upload', 'git', 'local']),
  installPath: z.string(),
  activatedAt: z.date().optional(),
  lastUpdate: z.date().optional(),
  updateAvailable: z.string().optional(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

// Export type guards and utilities
export const isThemeActive = (theme: Theme): boolean => theme.status === ThemeStatus.ACTIVE;
export const isThemeDefault = (theme: Theme): boolean => theme.isDefault;
export const isThemeInstalled = (theme: Theme): boolean => 
  theme.status !== ThemeStatus.INSTALLING && !!theme.installPath;
export const hasThemeError = (theme: Theme): boolean => theme.status === ThemeStatus.ERROR;
export const canActivateTheme = (theme: Theme): boolean => 
  theme.status === ThemeStatus.INACTIVE && !theme.errorMessage;
export const canDeactivateTheme = (theme: Theme): boolean => 
  theme.status === ThemeStatus.ACTIVE && !theme.isDefault;

// Theme template utilities
export const getThemeTemplate = (theme: Theme, type: string, name?: string): ThemeTemplate | undefined => {
  return theme.templates.find(template => 
    template.type === type && (name ? template.name === name : true)
  );
};

export const hasThemeTemplate = (theme: Theme, type: string): boolean => {
  return theme.templates.some(template => template.type === type);
};

export const getThemeTemplatesByType = (theme: Theme, type: string): ThemeTemplate[] => {
  return theme.templates.filter(template => template.type === type);
};

// Theme settings utilities
export const getThemeSetting = (theme: Theme, key: string): ThemeSetting | undefined => {
  return theme.settings.find(setting => setting.key === key);
};

export const getThemeSettingsBySection = (theme: Theme, section: string): ThemeSetting[] => {
  return theme.settings.filter(setting => setting.section === section);
};

export const getThemeSettingSections = (theme: Theme): string[] => {
  return [...new Set(theme.settings.map(setting => setting.section))];
};

// Color palette utilities
export const getThemeColor = (
  colors: ThemeColorPalette,
  colorName: keyof ThemeColorPalette,
  shade: keyof ThemeColor = '500' as keyof ThemeColor
): string | undefined => {
  const colorGroup = colors[colorName];
  if (typeof colorGroup === 'object' && colorGroup !== null) {
    return (colorGroup as ThemeColor)[shade];
  }
  return undefined;
};

export const generateColorScale = (baseColor: string): ThemeColor => {
  // This would typically contain logic to generate a full color scale from a base color
  // For now, return a basic structure
  return {
    500: baseColor,
    DEFAULT: baseColor
  };
};