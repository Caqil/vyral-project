import { Document } from 'mongoose';
export interface BaseEntity {
    _id?: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
}
export interface BaseDocument extends Document, BaseEntity {
}
export declare const ContentStatus: {
    readonly DRAFT: "draft";
    readonly PUBLISHED: "published";
    readonly PRIVATE: "private";
    readonly TRASH: "trash";
    readonly SCHEDULED: "scheduled";
};
export type ContentStatusType = typeof ContentStatus[keyof typeof ContentStatus];
export declare const ContentType: {
    readonly POST: "post";
    readonly PAGE: "page";
    readonly CUSTOM: "custom";
};
export type ContentTypeType = typeof ContentType[keyof typeof ContentType];
export declare const CommentStatus: {
    readonly PENDING: "pending";
    readonly APPROVED: "approved";
    readonly SPAM: "spam";
    readonly TRASH: "trash";
};
export type CommentStatusType = typeof CommentStatus[keyof typeof CommentStatus];
export declare const UserRole: {
    readonly SUPER_ADMIN: "super_admin";
    readonly ADMIN: "admin";
    readonly EDITOR: "editor";
    readonly AUTHOR: "author";
    readonly CONTRIBUTOR: "contributor";
    readonly SUBSCRIBER: "subscriber";
};
export type UserRoleType = typeof UserRole[keyof typeof UserRole];
export interface Permission {
    resource: string;
    actions: string[];
    conditions?: Record<string, any>;
}
export interface Metadata {
    [key: string]: any;
}
export interface SEOData {
    title?: string;
    description?: string;
    keywords?: string[];
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
    canonical?: string;
    noindex?: boolean;
    nofollow?: boolean;
    schema?: Record<string, any>;
}
export declare const MetadataSchema: any;
export declare const SEOSchema: any;
export declare const BaseEntitySchema: any;
//# sourceMappingURL=core.d.ts.map