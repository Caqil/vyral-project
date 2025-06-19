import { Schema, model, models } from 'mongoose';
import slugify from 'slugify';
import { Category } from '../types/content';
import { createBaseSchema, BaseDocument } from './base';

export interface CategoryDocument extends BaseDocument, Omit<Category, '_id'> {}

const CategorySchema = createBaseSchema({
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
    maxlength: 1000,
    trim: true
  },
  parent: {
    type: Schema.Types.ObjectId,
    ref: 'Category'
  },
  image: {
    type: Schema.Types.ObjectId,
    ref: 'Media'
  },
  color: {
    type: String,
    match: /^#[0-9A-F]{6}$/i
  },
  order: {
    type: Number,
    default: 0
  },
  postCount: {
    type: Number,
    default: 0
  },
  seo: {
    title: String,
    description: { type: String, maxlength: 160 },
    keywords: [String],
    ogTitle: String,
    ogDescription: String,
    ogImage: String,
    canonical: String,
    noindex: { type: Boolean, default: false },
    nofollow: { type: Boolean, default: false }
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
});

// Indexes
CategorySchema.index({ order: 1 });
CategorySchema.index({ name: 'text', description: 'text' });

// Virtual for URL
CategorySchema.virtual('url').get(function() {
  return `/category/${this.slug}`;
});

// Virtual for children
CategorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent'
});

// Pre-save middleware
CategorySchema.pre('save', async function(next) {
  if (!this.slug && this.name) {
    let baseSlug = slugify(this.name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    while (await models.Category?.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    this.slug = slug;
  }
  next();
});

export const CategoryModel = models.Category || model<CategoryDocument>('Category', CategorySchema);
