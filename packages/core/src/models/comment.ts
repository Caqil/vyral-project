import { Schema, model, models } from 'mongoose';
import { Comment } from '../types/content';
import { createBaseSchema, BaseDocument } from './base';

export interface CommentDocument extends BaseDocument, Omit<Comment, '_id'> {}

const CommentAuthorSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  website: {
    type: String,
    trim: true,
    match: /^https?:\/\/.+/
  },
  avatar: {
    type: String,
    trim: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, { _id: false });

const CommentSchema = createBaseSchema({
  postId: {
    type: Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
    index: true
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    index: true
  },
  author: {
    type: CommentAuthorSchema,
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'spam', 'trash'],
    default: 'pending',
    index: true
  },
  ip: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  replies: [{
    type: Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  likeCount: {
    type: Number,
    default: 0,
    min: 0
  },
  dislikeCount: {
    type: Number,
    default: 0,
    min: 0
  }
});

// Indexes
CommentSchema.index({ postId: 1, status: 1 });
CommentSchema.index({ status: 1, createdAt: -1 });
CommentSchema.index({ 'author.email': 1 });
CommentSchema.index({ 'author.userId': 1 });
CommentSchema.index({ content: 'text' });

// Virtual for reply count
CommentSchema.virtual('replyCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

// Virtual for children comments
CommentSchema.virtual('children', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId'
});

// Pre-save middleware to update parent's replies array
CommentSchema.pre('save', async function(next) {
  if (this.isNew && this.parentId) {
    await models.Comment?.findByIdAndUpdate(
      this.parentId,
      { $addToSet: { replies: this._id } }
    );
  }
  next();
});

// Post-remove middleware to clean up references
CommentSchema.pre('findOneAndDelete', async function(next) {
  const comment = await this.model.findOne(this.getFilter());
  if (comment) {
    // Remove from parent's replies array
    if (comment.parentId) {
      await models.Comment?.findByIdAndUpdate(
        comment.parentId,
        { $pull: { replies: comment._id } }
      );
    }
    
    // Delete all child comments
    const childComments = await models.Comment?.find({ parentId: comment._id });
    if (childComments?.length) {
      await models.Comment?.deleteMany({ parentId: comment._id });
    }
  }
  next();
});

export const CommentModel = models.Comment || model<CommentDocument>('Comment', CommentSchema);