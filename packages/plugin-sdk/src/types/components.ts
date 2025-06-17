import { ComponentType, ReactNode } from 'react';

// Plugin component props
export interface PluginComponentProps {
  pluginId: string;
  context: any;
  data?: any;
  [key: string]: any;
}

// Admin page component props
export interface AdminPageProps extends PluginComponentProps {
  title: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

// Widget component props
export interface WidgetProps extends PluginComponentProps {
  title?: string;
  config?: Record<string, any>;
  editable?: boolean;
}

// Shortcode component props
export interface ShortcodeProps extends PluginComponentProps {
  attributes: Record<string, any>;
  content?: string;
}

// Block component props
export interface BlockProps extends PluginComponentProps {
  attributes: Record<string, any>;
  setAttributes: (attributes: Record<string, any>) => void;
  isSelected?: boolean;
  clientId: string;
}

// Plugin component registration
export interface ComponentRegistration {
  name: string;
  component: ComponentType<any>;
  type: 'admin-page' | 'widget' | 'shortcode' | 'block' | 'custom';
  pluginId: string;
  props?: Record<string, any>;
}

// Widget definition
export interface WidgetDefinition {
  id: string;
  title: string;
  description: string;
  component: ComponentType<WidgetProps>;
  icon?: string;
  category?: string;
  configurable?: boolean;
  defaultConfig?: Record<string, any>;
  supports?: {
    multiple?: boolean;
    html?: boolean;
    alignment?: boolean;
    color?: boolean;
  };
}

// Shortcode definition
export interface ShortcodeDefinition {
  tag: string;
  title: string;
  description: string;
  component: ComponentType<ShortcodeProps>;
  attributes?: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    default?: any;
    required?: boolean;
    description?: string;
    options?: Array<{ label: string; value: any }>;
  }>;
  selfClosing?: boolean;
  example?: string;
}

// Block definition (for block editor)
export interface BlockDefinition {
  name: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  component: ComponentType<BlockProps>;
  attributes?: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    default?: any;
    source?: 'attribute' | 'text' | 'html' | 'children';
    selector?: string;
    attribute?: string;
  }>;
  supports?: {
    html?: boolean;
    className?: boolean;
    anchor?: boolean;
    align?: boolean | string[];
    color?: {
      background?: boolean;
      text?: boolean;
      gradients?: boolean;
    };
    spacing?: {
      margin?: boolean;
      padding?: boolean;
    };
  };
  example?: {
    attributes?: Record<string, any>;
    innerBlocks?: any[];
  };
}
