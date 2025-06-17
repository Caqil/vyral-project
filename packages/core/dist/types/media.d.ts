import { BaseEntity, Metadata } from './core';
export interface Media extends BaseEntity {
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    width?: number;
    height?: number;
    duration?: number;
    path: string;
    url: string;
    thumbnailUrl?: string;
    alt?: string;
    caption?: string;
    description?: string;
    title?: string;
    uploadedBy: string;
    folder?: string;
    tags: string[];
    isPublic: boolean;
    downloadCount: number;
    metadata: Metadata;
    variants?: MediaVariant[];
    exif?: Record<string, any>;
}
export interface MediaVariant {
    name: string;
    width: number;
    height: number;
    path: string;
    url: string;
    size: number;
    format: string;
}
export interface MediaFolder extends BaseEntity {
    name: string;
    slug: string;
    parent?: string;
    path: string;
    description?: string;
    isPublic: boolean;
    itemCount: number;
    totalSize: number;
    permissions?: {
        read: string[];
        write: string[];
        delete: string[];
    };
}
export declare const MediaSchema: any;
export declare const MediaFolderSchema: any;
//# sourceMappingURL=media.d.ts.map