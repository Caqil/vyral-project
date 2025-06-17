import { Schema, model, models } from 'mongoose';
import slugify from 'slugify';
import { createBaseSchema } from './base';
const PostSchema = createBaseSchema({
    title: {
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
    content: {
        type: String,
        required: true
    },
    excerpt: {
        type: String,
        maxlength: 500,
        trim: true
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'private', 'trash', 'scheduled'],
        default: 'draft',
        index: true
    },
    type: {
        type: String,
        enum: ['post', 'page', 'custom'],
        default: 'post',
        index: true
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    categories: [{
            type: Schema.Types.ObjectId,
            ref: 'Category'
        }],
    tags: [{
            type: Schema.Types.ObjectId,
            ref: 'Tag'
        }],
    featuredImage: {
        type: Schema.Types.ObjectId,
        ref: 'Media'
    },
    gallery: [{
            type: Schema.Types.ObjectId,
            ref: 'Media'
        }],
    publishedAt: {
        type: Date,
        index: true
    },
    scheduledAt: {
        type: Date,
        index: true
    },
    template: {
        type: String,
        trim: true
    },
    parentId: {
        type: Schema.Types.ObjectId,
        ref: 'Post'
    },
    order: {
        type: Number,
        default: 0
    },
    commentStatus: {
        type: String,
        enum: ['open', 'closed'],
        default: 'open'
    },
    pingStatus: {
        type: String,
        enum: ['open', 'closed'],
        default: 'open'
    },
    sticky: {
        type: Boolean,
        default: false
    },
    password: {
        type: String,
        select: false
    },
    seo: {
        title: String,
        description: { type: String, maxlength: 160 },
        keywords: [String],
        ogTitle: String,
        ogDescription: String,
        ogImage: String,
        twitterTitle: String,
        twitterDescription: String,
        twitterImage: String,
        canonical: String,
        noindex: { type: Boolean, default: false },
        nofollow: { type: Boolean, default: false },
        schema: Schema.Types.Mixed
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {}
    },
    revisions: [{
            type: Schema.Types.ObjectId,
            ref: 'PostRevision'
        }],
    viewCount: {
        type: Number,
        default: 0
    },
    likeCount: {
        type: Number,
        default: 0
    },
    shareCount: {
        type: Number,
        default: 0
    }
});
// Indexes
PostSchema.index({ slug: 1 });
PostSchema.index({ status: 1, publishedAt: -1 });
PostSchema.index({ type: 1, status: 1 });
PostSchema.index({ author: 1, status: 1 });
PostSchema.index({ categories: 1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ publishedAt: -1 });
PostSchema.index({ 'seo.title': 'text', title: 'text', content: 'text' });
// Virtual for URL
PostSchema.virtual('url').get(function () {
    return `/${this.type}/${this.slug}`;
});
// Virtual for reading time (words per minute)
PostSchema.virtual('readingTime').get(function () {
    const wordsPerMinute = 200;
    const wordCount = this.content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
});
// Pre-save middleware
PostSchema.pre('save', async function (next) {
    // Generate slug if not provided
    if (!this.slug && this.title) {
        let baseSlug = slugify(this.title, { lower: true, strict: true });
        let slug = baseSlug;
        let counter = 1;
        // Ensure unique slug
        while (await models.Post?.findOne({ slug, _id: { $ne: this._id } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        this.slug = slug;
    }
    // Set published date when status changes to published
    if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
        this.publishedAt = new Date();
    }
    next();
});
export const PostModel = models.Post || model('Post', PostSchema);
//# sourceMappingURL=post.js.map