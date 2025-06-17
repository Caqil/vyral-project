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
export declare const UserSchema: any;
export declare const UserUpdateSchema: any;
export declare const UserPreferencesSchema: any;
//# sourceMappingURL=user.d.ts.map