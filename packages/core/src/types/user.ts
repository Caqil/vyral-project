
import { z } from 'zod';
import { BaseEntity, UserRoleType, Permission, Metadata } from './core';

export interface User extends BaseEntity {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  website?: string;
  phone?: string;
  role: UserRoleType;
  status: 'active' | 'inactive' | 'banned' | 'pending';
  emailVerified: boolean;
  lastLogin?: Date;
  loginCount: number;
  permissions: Permission[];
  preferences: UserPreferences;
  social: SocialProfiles;
  metadata: Metadata;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  recoveryTokens?: string[];
}

export interface UserPreferences {
  language: string;
  timezone: string;
  theme: 'light' | 'dark' | 'system';
  emailNotifications: {
    comments: boolean;
    posts: boolean;
    system: boolean;
    marketing: boolean;
  };
  privacy: {
    showEmail: boolean;
    showProfile: boolean;
    allowMessages: boolean;
  };
}

export interface SocialProfiles {
  twitter?: string;
  facebook?: string;
  linkedin?: string;
  github?: string;
  instagram?: string;
  youtube?: string;
}

export interface UserSession extends BaseEntity {
  userId: string;
  token: string;
  refreshToken: string;
  ip: string;
  userAgent: string;
  expiresAt: Date;
  lastActivity: Date;
  device?: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
  };
}

export interface LoginAttempt extends BaseEntity {
  email: string;
  ip: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
  location?: {
    country: string;
    city: string;
    latitude: number;
    longitude: number;
  };
}

// Validation Schemas
export const UserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  displayName: z.string().min(1).max(100),
  avatar: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional(),
  phone: z.string().optional(),
  role: z.enum(['super_admin', 'admin', 'editor', 'author', 'contributor', 'subscriber']),
  status: z.enum(['active', 'inactive', 'banned', 'pending']).default('active'),
  emailVerified: z.boolean().default(false),
  preferences: z.object({
    language: z.string().default('en'),
    timezone: z.string().default('UTC'),
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    emailNotifications: z.object({
      comments: z.boolean().default(true),
      posts: z.boolean().default(true),
      system: z.boolean().default(true),
      marketing: z.boolean().default(false)
    }),
    privacy: z.object({
      showEmail: z.boolean().default(false),
      showProfile: z.boolean().default(true),
      allowMessages: z.boolean().default(true)
    })
  }).optional(),
  social: z.object({
    twitter: z.string().optional(),
    facebook: z.string().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
    instagram: z.string().optional(),
    youtube: z.string().optional()
  }).optional(),
  metadata: z.record(z.any()).optional()
});

export const UserUpdateSchema = UserSchema.partial().omit({ password: true });

export const UserPreferencesSchema = z.object({
  language: z.string(),
  timezone: z.string(),
  theme: z.enum(['light', 'dark', 'system']),
  emailNotifications: z.object({
    comments: z.boolean(),
    posts: z.boolean(),
    system: z.boolean(),
    marketing: z.boolean()
  }),
  privacy: z.object({
    showEmail: z.boolean(),
    showProfile: z.boolean(),
    allowMessages: z.boolean()
  })
});