import { BaseEntity, ContentStatusType, ContentTypeType, SEOData, Metadata } from './core';
export interface Post extends BaseEntity {
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    status: ContentStatusType;
    type: ContentTypeType;
    author: string;
    categories: string[];
    tags: string[];
    featuredImage?: string;
    gallery?: string[];
    publishedAt?: Date;
    scheduledAt?: Date;
    template?: string;
    parentId?: string;
    order?: number;
    commentStatus: 'open' | 'closed';
    pingStatus: 'open' | 'closed';
    sticky?: boolean;
    password?: string;
    seo: SEOData;
    metadata: Metadata;
    revisions?: string[];
    viewCount?: number;
    likeCount?: number;
    shareCount?: number;
}
export interface Category extends BaseEntity {
    name: string;
    slug: string;
    description?: string;
    parent?: string;
    image?: string;
    color?: string;
    order?: number;
    postCount: number;
    seo: SEOData;
    metadata: Metadata;
}
export interface Tag extends BaseEntity {
    name: string;
    slug: string;
    description?: string;
    color?: string;
    postCount: number;
    seo: SEOData;
    metadata: Metadata;
}
export interface Comment extends BaseEntity {
    postId: string;
    parentId?: string;
    author: {
        name: string;
        email: string;
        website?: string;
        avatar?: string;
        userId?: string;
    };
    content: string;
    status: 'pending' | 'approved' | 'spam' | 'trash';
    ip?: string;
    userAgent?: string;
    metadata: Metadata;
    replies?: string[];
    likeCount?: number;
    dislikeCount?: number;
}
export interface PostRevision extends BaseEntity {
    postId: string;
    title: string;
    content: string;
    excerpt?: string;
    author: string;
    revisionNumber: number;
    changeSummary?: string;
}
export declare const PostSchema: any;
export declare const CategorySchema: any;
export declare const TagSchema: any;
export declare const CommentSchema: any;
//# sourceMappingURL=content.d.ts.map