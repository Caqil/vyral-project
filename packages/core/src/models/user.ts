import { Schema, model, models } from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../types/user';
import { createBaseSchema, BaseDocument } from './base';

export interface UserDocument extends BaseDocument, Omit<User, '_id'> {
  comparePassword(password: string): Promise<boolean>;
  generateHash(password: string): Promise<string>;
}

const UserSchema = createBaseSchema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
    match: /^[a-zA-Z0-9_]+$/
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  avatar: {
    type: Schema.Types.ObjectId,
    ref: 'Media'
  },
  bio: {
    type: String,
    maxlength: 500,
    trim: true
  },
  website: {
    type: String,
    trim: true,
    match: /^https?:\/\/.+/
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'editor', 'author', 'contributor', 'subscriber'],
    default: 'subscriber'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'banned', 'pending'],
    default: 'pending'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  loginCount: {
    type: Number,
    default: 0
  },
  permissions: [{
    resource: String,
    actions: [String],
    conditions: Schema.Types.Mixed
  }],
  preferences: {
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    emailNotifications: {
      comments: { type: Boolean, default: true },
      posts: { type: Boolean, default: true },
      system: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false }
    },
    privacy: {
      showEmail: { type: Boolean, default: false },
      showProfile: { type: Boolean, default: true },
      allowMessages: { type: Boolean, default: true }
    }
  },
  social: {
    twitter: String,
    facebook: String,
    linkedin: String,
    github: String,
    instagram: String,
    youtube: String
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  recoveryTokens: {
    type: [String],
    select: false
  }
});

// Indexes
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ displayName: 'text', bio: 'text' });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim() || this.displayName;
});

// Virtual for avatar URL
UserSchema.virtual('avatarUrl').get(function() {
  return this.avatar || '/images/default-avatar.png';
});

// Pre-save middleware for password hashing
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance methods
UserSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

UserSchema.methods.generateHash = async function(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

export const UserModel = models.User || model<UserDocument>('User', UserSchema);
