import { z } from 'zod';
// Validation Schemas
export const MediaSchema = z.object({
    filename: z.string().min(1),
    originalName: z.string().min(1),
    mimeType: z.string(),
    size: z.number().positive(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    duration: z.number().positive().optional(),
    path: z.string(),
    url: z.string().url(),
    thumbnailUrl: z.string().url().optional(),
    alt: z.string().max(255).optional(),
    caption: z.string().max(500).optional(),
    description: z.string().max(1000).optional(),
    title: z.string().max(255).optional(),
    uploadedBy: z.string(),
    folder: z.string().optional(),
    tags: z.array(z.string()),
    isPublic: z.boolean().default(true),
    metadata: z.record(z.any()).optional()
});
export const MediaFolderSchema = z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(100),
    parent: z.string().optional(),
    description: z.string().max(500).optional(),
    isPublic: z.boolean().default(true)
});
//# sourceMappingURL=media.js.map