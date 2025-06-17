import { z } from 'zod';
// Content Status
export const ContentStatus = {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    PRIVATE: 'private',
    TRASH: 'trash',
    SCHEDULED: 'scheduled'
};
// Content Type
export const ContentType = {
    POST: 'post',
    PAGE: 'page',
    CUSTOM: 'custom'
};
// Comment Status
export const CommentStatus = {
    PENDING: 'pending',
    APPROVED: 'approved',
    SPAM: 'spam',
    TRASH: 'trash'
};
// User Roles
export const UserRole = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    EDITOR: 'editor',
    AUTHOR: 'author',
    CONTRIBUTOR: 'contributor',
    SUBSCRIBER: 'subscriber'
};
// Validation Schemas
export const MetadataSchema = z.record(z.any());
export const SEOSchema = z.object({
    title: z.string().optional(),
    description: z.string().max(160).optional(),
    keywords: z.array(z.string()).optional(),
    ogTitle: z.string().optional(),
    ogDescription: z.string().optional(),
    ogImage: z.string().url().optional(),
    twitterTitle: z.string().optional(),
    twitterDescription: z.string().optional(),
    twitterImage: z.string().url().optional(),
    canonical: z.string().url().optional(),
    noindex: z.boolean().optional(),
    nofollow: z.boolean().optional(),
    schema: z.record(z.any()).optional()
});
export const BaseEntitySchema = z.object({
    _id: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    createdBy: z.string().optional(),
    updatedBy: z.string().optional()
});
//# sourceMappingURL=core.js.map