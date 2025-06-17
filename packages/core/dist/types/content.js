import { z } from 'zod';
// Validation Schemas
export const PostSchema = z.object({
    title: z.string().min(1).max(255),
    slug: z.string().min(1).max(255),
    content: z.string(),
    excerpt: z.string().max(500).optional(),
    status: z.enum(['draft', 'published', 'private', 'trash', 'scheduled']),
    type: z.enum(['post', 'page', 'custom']),
    author: z.string(),
    categories: z.array(z.string()),
    tags: z.array(z.string()),
    featuredImage: z.string().optional(),
    gallery: z.array(z.string()).optional(),
    publishedAt: z.date().optional(),
    scheduledAt: z.date().optional(),
    template: z.string().optional(),
    parentId: z.string().optional(),
    order: z.number().optional(),
    commentStatus: z.enum(['open', 'closed']).default('open'),
    pingStatus: z.enum(['open', 'closed']).default('open'),
    sticky: z.boolean().optional(),
    password: z.string().optional(),
    seo: z.object({}).optional(),
    metadata: z.record(z.any()).optional()
});
export const CategorySchema = z.object({
    name: z.string().min(1).max(255),
    slug: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    parent: z.string().optional(),
    image: z.string().optional(),
    color: z.string().optional(),
    order: z.number().optional(),
    seo: z.object({}).optional(),
    metadata: z.record(z.any()).optional()
});
export const TagSchema = z.object({
    name: z.string().min(1).max(255),
    slug: z.string().min(1).max(255),
    description: z.string().max(500).optional(),
    color: z.string().optional(),
    seo: z.object({}).optional(),
    metadata: z.record(z.any()).optional()
});
export const CommentSchema = z.object({
    postId: z.string(),
    parentId: z.string().optional(),
    author: z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
        website: z.string().url().optional(),
        avatar: z.string().optional(),
        userId: z.string().optional()
    }),
    content: z.string().min(1).max(2000),
    status: z.enum(['pending', 'approved', 'spam', 'trash']).default('pending'),
    ip: z.string().optional(),
    userAgent: z.string().optional(),
    metadata: z.record(z.any()).optional()
});
//# sourceMappingURL=content.js.map