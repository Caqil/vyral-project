import { Schema, model, models } from 'mongoose';
import { Activity } from '../types/system';
import { createBaseSchema, BaseDocument } from './base';

export interface ActivityDocument extends BaseDocument, Omit<Activity, '_id'> {}

const ActivitySchema = createBaseSchema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    index: true
  },
  resourceType: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
    index: true,
    enum: [
      'post',
      'page', 
      'comment',
      'category',
      'tag',
      'user',
      'media',
      'setting',
      'navigation',
      'plugin',
      'theme',
      'backup',
      'system'
    ]
  },
  resourceId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  ip: {
    type: String,
    required: true,
    trim: true
  },
  userAgent: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
});

// Compound indexes for common queries
ActivitySchema.index({ userId: 1, createdAt: -1 });
ActivitySchema.index({ resourceType: 1, resourceId: 1 });
ActivitySchema.index({ resourceType: 1, action: 1 });
ActivitySchema.index({ action: 1, createdAt: -1 });
ActivitySchema.index({ createdAt: -1 }); // For general activity feeds

// Text index for searching descriptions
ActivitySchema.index({ description: 'text', action: 'text' });

// Virtual for user details
ActivitySchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Virtual for formatted action description
ActivitySchema.virtual('actionDescription').get(function() {
  const actionMap: Record<string, string> = {
    'create': 'created',
    'update': 'updated',
    'delete': 'deleted',
    'publish': 'published',
    'unpublish': 'unpublished',
    'approve': 'approved',
    'reject': 'rejected',
    'login': 'logged in',
    'logout': 'logged out',
    'upload': 'uploaded',
    'download': 'downloaded',
    'install': 'installed',
    'activate': 'activated',
    'deactivate': 'deactivated',
    'uninstall': 'uninstalled'
  };

  return actionMap[this.action] || this.action;
});

// Static method to log activity
ActivitySchema.statics.logActivity = async function(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  description: string,
  metadata: any = {},
  ip: string = '',
  userAgent: string = ''
) {
  try {
    const activity = new this({
      userId,
      action,
      resourceType,
      resourceId,
      description,
      metadata,
      ip,
      userAgent
    });

    await activity.save();
    return activity;
  } catch (error) {
    console.error('Failed to log activity:', error);
    throw error;
  }
};

// Static method to get user activity
ActivitySchema.statics.getUserActivity = async function(
  userId: string,
  options: {
    limit?: number;
    skip?: number;
    resourceType?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  const {
    limit = 50,
    skip = 0,
    resourceType,
    action,
    startDate,
    endDate
  } = options;

  const filter: any = { userId };

  if (resourceType) {
    filter.resourceType = resourceType;
  }

  if (action) {
    filter.action = action;
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = startDate;
    if (endDate) filter.createdAt.$lte = endDate;
  }

  return this.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'displayName username email avatar')
    .lean();
};

// Static method to get activity feed
ActivitySchema.statics.getActivityFeed = async function(
  options: {
    limit?: number;
    skip?: number;
    resourceTypes?: string[];
    actions?: string[];
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  const {
    limit = 100,
    skip = 0,
    resourceTypes,
    actions,
    startDate,
    endDate
  } = options;

  const filter: any = {};

  if (resourceTypes?.length) {
    filter.resourceType = { $in: resourceTypes };
  }

  if (actions?.length) {
    filter.action = { $in: actions };
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = startDate;
    if (endDate) filter.createdAt.$lte = endDate;
  }

  return this.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'displayName username email avatar')
    .lean();
};

// TTL index to automatically delete old activities (optional)
// Uncomment to enable automatic cleanup after 1 year
// ActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const ActivityModel = models.Activity || model<ActivityDocument>('Activity', ActivitySchema);