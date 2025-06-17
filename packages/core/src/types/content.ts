import { z } from 'zod';
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
