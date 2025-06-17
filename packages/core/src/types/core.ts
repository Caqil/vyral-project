import { Document } from 'mongoose';
import { z } from 'zod';

// Base interfaces
export interface BaseEntity {
  _id?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface BaseDocument extends Document, Omit<BaseEntity, '_id'> {}

// Content Status
export const ContentStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  PRIVATE: 'private',
  TRASH: 'trash',
  SCHEDULED: 'scheduled'
} as const;

export type ContentStatusType = typeof ContentStatus[keyof typeof ContentStatus];

// Content Type
export const ContentType = {
  POST: 'post',
  PAGE: 'page',
  CUSTOM: 'custom'
} as const;

export type ContentTypeType = typeof ContentType[keyof typeof ContentType];

// Comment Status
export const CommentStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  SPAM: 'spam',
  TRASH: 'trash'
} as const;

export type CommentStatusType = typeof CommentStatus[keyof typeof CommentStatus];

// User Roles
export const UserRole = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  EDITOR: 'editor',
  AUTHOR: 'author',
  CONTRIBUTOR: 'contributor',
  SUBSCRIBER: 'subscriber'
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// Permission types
export interface Permission {
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
}

// Metadata interface
export interface Metadata {
  [key: string]: any;
}

// SEO interface
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