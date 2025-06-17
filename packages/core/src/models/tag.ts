import { Schema, model, models } from 'mongoose';
import slugify from 'slugify';
import { Tag } from '../types/content';
import { createBaseSchema, BaseDocument } from './base';

export interface TagDocument extends BaseDocument, Omit<Tag, '_id'> {}

const TagSchema = createBaseSchema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 255
  },
  description: {
    type: String,
    maxlength: 500,
    trim: true
  },
  color: {
    type: String,
    match: /^#[0-9A-F]{6}$/i
  },
  postCount: {
    type: Number,
    default: 0
  },
  seo: {
    title: String,
    description: { type: String, maxlength: 160 },
    keywords: [String],
    canonical: String,
    noindex: { type: Boolean, default: false }
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
});

// Indexes
TagSchema.index({ slug: 1 });
TagSchema.index({ name: 'text', description: 'text' });

// Virtual for URL
TagSchema.virtual('url').get(function() {
  return `/tag/${this.slug}`;
});

// Pre-save middleware
TagSchema.pre('save', async function(next) {
  if (!this.slug && this.name) {
    let baseSlug = slugify(this.name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    while (await models.Tag?.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    this.slug = slug;
  }
  next();
});

export const TagModel = models.Tag || model<TagDocument>('Tag', TagSchema);
