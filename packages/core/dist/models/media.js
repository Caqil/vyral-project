import { Schema, model, models } from 'mongoose';
import { createBaseSchema } from './base';
const MediaVariantSchema = new Schema({
    name: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    path: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number, required: true },
    format: { type: String, required: true }
}, { _id: false });
const MediaSchema = createBaseSchema({
    filename: {
        type: String,
        required: true,
        trim: true
    },
    originalName: {
        type: String,
        required: true,
        trim: true
    },
    mimeType: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true,
        min: 0
    },
    width: {
        type: Number,
        min: 0
    },
    height: {
        type: Number,
        min: 0
    },
    duration: {
        type: Number,
        min: 0
    },
    path: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    thumbnailUrl: {
        type: String
    },
    alt: {
        type: String,
        maxlength: 255,
        trim: true
    },
    caption: {
        type: String,
        maxlength: 500,
        trim: true
    },
    description: {
        type: String,
        maxlength: 1000,
        trim: true
    },
    title: {
        type: String,
        maxlength: 255,
        trim: true
    },
    uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    folder: {
        type: Schema.Types.ObjectId,
        ref: 'MediaFolder'
    },
    tags: [String],
    isPublic: {
        type: Boolean,
        default: true
    },
    downloadCount: {
        type: Number,
        default: 0
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {}
    },
    variants: [MediaVariantSchema],
    exif: {
        type: Schema.Types.Mixed
    }
});
// Indexes
MediaSchema.index({ filename: 1 });
MediaSchema.index({ mimeType: 1 });
MediaSchema.index({ uploadedBy: 1 });
MediaSchema.index({ folder: 1 });
MediaSchema.index({ tags: 1 });
MediaSchema.index({ title: 'text', alt: 'text', description: 'text' });
// Virtual for file type
MediaSchema.virtual('fileType').get(function () {
    return this.mimeType.split('/')[0];
});
// Virtual for file extension
MediaSchema.virtual('extension').get(function () {
    return this.filename.split('.').pop()?.toLowerCase();
});
// Virtual for human-readable size
MediaSchema.virtual('humanSize').get(function () {
    const bytes = this.size;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0)
        return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});
export const MediaModel = models.Media || model('Media', MediaSchema);
//# sourceMappingURL=media.js.map