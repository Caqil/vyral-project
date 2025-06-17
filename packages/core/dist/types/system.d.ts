import { BaseEntity, Metadata } from './core';
export interface Setting extends BaseEntity {
    key: string;
    value: any;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    group: string;
    label: string;
    description?: string;
    isPublic: boolean;
    isAutoload: boolean;
    validation?: Record<string, any>;
    metadata: Metadata;
}
export interface Navigation extends BaseEntity {
    name: string;
    slug: string;
    items: NavigationItem[];
    location: string;
    isActive: boolean;
    metadata: Metadata;
}
export interface NavigationItem {
    id: string;
    label: string;
    url: string;
    type: 'page' | 'post' | 'category' | 'tag' | 'custom' | 'external';
    target: '_self' | '_blank';
    cssClass?: string;
    order: number;
    parent?: string;
    children?: NavigationItem[];
    conditions?: {
        loggedIn?: boolean;
        roles?: string[];
        permissions?: string[];
    };
}
export interface Activity extends BaseEntity {
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    description: string;
    ip: string;
    userAgent: string;
    metadata: Metadata;
}
export interface Backup extends BaseEntity {
    name: string;
    type: 'full' | 'database' | 'files';
    size: number;
    path: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    progress: number;
    startedAt: Date;
    completedAt?: Date;
    errorMessage?: string;
    metadata: Metadata;
}
export interface CacheEntry extends BaseEntity {
    key: string;
    value: any;
    ttl: number;
    tags: string[];
    expiresAt: Date;
}
export declare const SettingSchema: any;
export declare const NavigationItemSchema: any;
export declare const NavigationSchema: any;
//# sourceMappingURL=system.d.ts.map