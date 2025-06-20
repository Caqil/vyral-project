import { BaseService } from './base';
import { MediaModel, MediaDocument } from '../models/media';
import { Media, MediaVariant } from '../types/media';
import { PaginationParams, PaginationResult } from '../types/api';
import { NotFoundError, ValidationError } from '../errors';
import { CACHE_KEYS, CACHE_TTL, UPLOAD_LIMITS, IMAGE_SIZES } from '../constants';
import { CacheManager } from '../utils/cache';
import { validateFile, generateUniqueFilename, humanFileSize } from '../utils/file';
import { FilterQuery } from 'mongoose';

export class MediaService extends BaseService<MediaDocument> {
  private cache: CacheManager;

  constructor() {
    super(MediaModel, 'MediaService');
    this.cache = CacheManager.getInstance();
  }

  async uploadMedia(data: Partial<Media>): Promise<MediaDocument> {
    // Validate file data
    if (data.filename && data.size && data.mimeType) {
      const validation = validateFile(
        { name: data.filename, size: data.size, type: data.mimeType },
        { 
          maxSize: UPLOAD_LIMITS.MAX_FILE_SIZE,
          allowedExtensions: UPLOAD_LIMITS.ALLOWED_EXTENSIONS.slice()
        }
      );

      if (!validation.valid) {
        throw new ValidationError(validation.errors.join(', '));
      }
    }

    const media = await this.create(data);
    
    // Clear media caches
    await this.cache.deleteByPattern('media:*');
    
    this.logger.info(`Uploaded media: ${media.filename} (${humanFileSize(media.size)})`);
    return media;
  }

  async getMediaById(id: string): Promise<MediaDocument | null> {
    let media = await this.cache.get<MediaDocument>(`media:${id}`);
    
    if (!media) {
      media = await this.findById(id, {
        populate: [
          { path: 'uploadedBy', select: 'displayName username' },
          { path: 'folder' }
        ]
      });
      
      if (media) {
        await this.cache.set(`media:${id}`, media, CACHE_TTL.MEDIUM);
      }
    }

    return media;
  }
async getStarredMedia(
  userId?: string,
  pagination?: PaginationParams
): Promise<PaginationResult<MediaDocument>> {
  const filter: FilterQuery<MediaDocument> = { starred: true };
  
  if (userId) {
    filter.uploadedBy = userId;
  }

  const populateOptions = {
    populate: [
      { path: 'uploadedBy', select: 'displayName username avatar' },
      { path: 'folder', select: 'name slug path' }
    ]
  };

  return await this.findMany(filter, pagination, populateOptions);
}

async toggleStarred(id: string): Promise<MediaDocument> {
  const media = await this.findByIdOrThrow(id);
  const newStarredState = !media.starred;
  
  // ✅ Pass simple boolean value
  return await this.updateMedia(id, { starred: newStarredState });
}
  async getMediaByFilename(filename: string): Promise<MediaDocument | null> {
    return await this.findOne({ filename });
  }

  async getMediaLibrary(
    options: {
      mimeType?: string;
      folder?: string;
      uploadedBy?: string;
      search?: string;
      isPublic?: boolean;
    } = {},
    pagination?: PaginationParams
  ): Promise<PaginationResult<MediaDocument>> {
    const cacheKey = `media:library:${JSON.stringify(options)}:${JSON.stringify(pagination)}`;
    let result = await this.cache.get<PaginationResult<MediaDocument>>(cacheKey);

    if (!result) {
      const filter: FilterQuery<MediaDocument> = {};

      if (options.mimeType) {
        if (options.mimeType.includes('/')) {
          filter.mimeType = options.mimeType;
        } else {
          // Filter by type (e.g., 'image', 'video', 'audio')
          filter.mimeType = { $regex: `^${options.mimeType}/` };
        }
      }

      if (options.folder) {
        filter.folder = options.folder;
      }

      if (options.uploadedBy) {
        filter.uploadedBy = options.uploadedBy;
      }

      if (options.search) {
        filter.$or = [
          { filename: { $regex: options.search, $options: 'i' } },
          { originalName: { $regex: options.search, $options: 'i' } },
          { title: { $regex: options.search, $options: 'i' } },
          { alt: { $regex: options.search, $options: 'i' } },
          { description: { $regex: options.search, $options: 'i' } },
          { tags: { $in: [new RegExp(options.search, 'i')] } }
        ];
      }

      if (options.isPublic !== undefined) {
        filter.isPublic = options.isPublic;
      }

      const populateOptions = {
        populate: [
          { path: 'uploadedBy', select: 'displayName username avatar' },
          { path: 'folder', select: 'name slug path' }
        ]
      };

      result = await this.findMany(filter, pagination, populateOptions);
      await this.cache.set(cacheKey, result, CACHE_TTL.SHORT);
    }

    return result;
  }

  async updateMedia(id: string, data: Partial<Media>): Promise<MediaDocument> {
    const media = await this.updateByIdOrThrow(id, data);
    
    // Clear cache
    await this.cache.delete(`media:${id}`);
    await this.cache.deleteByPattern('media:library:*');
    
    this.logger.info(`Updated media: ${id}`);
    return media;
  }

  async deleteMedia(id: string): Promise<void> {
    const media = await this.findByIdOrThrow(id);
    
    await this.deleteByIdOrThrow(id);
    
    // Clear cache
    await this.cache.delete(`media:${id}`);
    await this.cache.deleteByPattern('media:library:*');
    
    this.logger.info(`Deleted media: ${media.filename}`);
  }

  async incrementDownloadCount(id: string): Promise<void> {
    await this.model.findByIdAndUpdate(id, { $inc: { downloadCount: 1 } });
    
    // Clear cache to reflect updated count
    await this.cache.delete(`media:${id}`);
  }

  async getImagesByDimensions(
    minWidth?: number,
    minHeight?: number,
    maxWidth?: number,
    maxHeight?: number,
    pagination?: PaginationParams
  ): Promise<PaginationResult<MediaDocument>> {
    const filter: FilterQuery<MediaDocument> = {
      mimeType: { $regex: '^image/' }
    };

    if (minWidth) filter.width = { ...filter.width, $gte: minWidth };
    if (maxWidth) filter.width = { ...filter.width, $lte: maxWidth };
    if (minHeight) filter.height = { ...filter.height, $gte: minHeight };
    if (maxHeight) filter.height = { ...filter.height, $lte: maxHeight };

    return await this.findMany(filter, pagination);
  }

  async getMediaByType(
    type: 'image' | 'video' | 'audio' | 'document',
    pagination?: PaginationParams
  ): Promise<PaginationResult<MediaDocument>> {
    const mimeTypePatterns = {
      image: '^image/',
      video: '^video/',
      audio: '^audio/',
      document: '^(application/|text/)'
    };

    const filter = {
      mimeType: { $regex: mimeTypePatterns[type] }
    };

    return await this.findMany(filter, pagination);
  }

  async getRecentUploads(
    limit: number = 20,
    userId?: string
  ): Promise<MediaDocument[]> {
    const cacheKey = `media:recent:${userId || 'all'}:${limit}`;
    let media = await this.cache.get<MediaDocument[]>(cacheKey);

    if (!media) {
      const filter = userId ? { uploadedBy: userId } : {};
      
      const result = await this.findMany(
        filter,
        { page: 1, limit, sort: 'createdAt', order: 'desc' },
        {
          populate: [
            { path: 'uploadedBy', select: 'displayName username avatar' }
          ]
        }
      );

      media = result.data;
      await this.cache.set(cacheKey, media, CACHE_TTL.SHORT);
    }

    return media;
  }

  async getMediaStats(): Promise<{
    total: number;
    totalSize: number;
    byType: Record<string, { count: number; size: number }>;
    recentUploads: number;
  }> {
    const cacheKey = 'media:stats';
    let stats = await this.cache.get<any>(cacheKey);

    if (!stats) {
      const total = await this.count({});
      const totalSizeResult = await this.model.aggregate([
        { $group: { _id: null, totalSize: { $sum: '$size' } } }
      ]);
      const totalSize = totalSizeResult[0]?.totalSize || 0;

      // Get stats by type
      const typeStats = await this.model.aggregate([
        {
          $addFields: {
            fileType: { $arrayElemAt: [{ $split: ['$mimeType', '/'] }, 0] }
          }
        },
        {
          $group: {
            _id: '$fileType',
            count: { $sum: 1 },
            size: { $sum: '$size' }
          }
        }
      ]);

      const byType: Record<string, { count: number; size: number }> = {};
      typeStats.forEach(stat => {
        byType[stat._id] = { count: stat.count, size: stat.size };
      });

      // Recent uploads (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentUploads = await this.count({ createdAt: { $gte: weekAgo } });

      stats = { total, totalSize, byType, recentUploads };
      await this.cache.set(cacheKey, stats, CACHE_TTL.MEDIUM);
    }

    return stats;
  }

  async searchMedia(
    query: string,
    options: {
      mimeType?: string;
      folder?: string;
      uploadedBy?: string;
    } = {},
    pagination?: PaginationParams
  ): Promise<PaginationResult<MediaDocument>> {
    const filter: FilterQuery<MediaDocument> = {
      $text: { $search: query }
    };

    if (options.mimeType) {
      filter.mimeType = { $regex: `^${options.mimeType}` };
    }

    if (options.folder) {
      filter.folder = options.folder;
    }

    if (options.uploadedBy) {
      filter.uploadedBy = options.uploadedBy;
    }

    const populateOptions = {
      populate: [
        { path: 'uploadedBy', select: 'displayName username avatar' },
        { path: 'folder', select: 'name slug path' }
      ]
    };

    return await this.findMany(filter, pagination, populateOptions);
  }

  async addVariant(
    mediaId: string,
    variant: MediaVariant
  ): Promise<MediaDocument> {
    const media = await this.findByIdOrThrow(mediaId);
    
    // Check if variant with same name already exists
    const existingVariantIndex = media.variants?.findIndex(v => v.name === variant.name);
    
    if (existingVariantIndex !== undefined && existingVariantIndex > -1) {
      // Update existing variant
      media.variants![existingVariantIndex] = variant;
    } else {
      // Add new variant
      if (!media.variants) media.variants = [];
      media.variants.push(variant);
    }

    const updated = await media.save();
    
    // Clear cache
    await this.cache.delete(`media:${mediaId}`);
    
    this.logger.info(`Added variant ${variant.name} to media ${mediaId}`);
    return updated;
  }

  async removeVariant(mediaId: string, variantName: string): Promise<MediaDocument> {
    const media = await this.findByIdOrThrow(mediaId);
    
    if (media.variants) {
      media.variants = media.variants.filter(v => v.name !== variantName);
      const updated = await media.save();
      
      // Clear cache
      await this.cache.delete(`media:${mediaId}`);
      
      this.logger.info(`Removed variant ${variantName} from media ${mediaId}`);
      return updated;
    }

    return media;
  }

  async getMediaUsage(mediaId: string): Promise<{
    posts: any[];
    pages: any[];
    comments: any[];
  }> {
    const media = await this.findByIdOrThrow(mediaId);
    
    // This would need to be implemented based on how media is referenced
    // in your content. For now, returning empty arrays as placeholder
    const usage = {
      posts: [],
      pages: [],
      comments: []
    };

    // TODO: Implement actual usage tracking
    // You might want to search for media URL in post content, 
    // check featuredImage references, etc.

    return usage;
  }

  async bulkDelete(ids: string[]): Promise<{ deleted: number; errors: string[] }> {
    const result = { deleted: 0, errors: [] as string[] };

    for (const id of ids) {
      try {
        await this.deleteMedia(id);
        result.deleted++;
      } catch (error: any) {
        result.errors.push(`Failed to delete media ${id}: ${error.message}`);
      }
    }

    this.logger.info(`Bulk deleted ${result.deleted} media files`);
    return result;
  }

  async generateImageVariants(
    mediaId: string,
    sizes: Record<string, { width: number; height: number }> = IMAGE_SIZES
  ): Promise<MediaDocument> {
    const media = await this.findByIdOrThrow(mediaId);
    
    if (!media.mimeType.startsWith('image/')) {
      throw new ValidationError('Media must be an image to generate variants');
    }

    // This is a placeholder - you'd need to implement actual image resizing
    // using a library like Sharp, Canvas, or an external service
    
    const variants: MediaVariant[] = [];
    
    for (const [sizeName, dimensions] of Object.entries(sizes)) {
      // Skip if image is smaller than the variant size
      if (media.width && media.height && 
          (media.width < dimensions.width || media.height < dimensions.height)) {
        continue;
      }

      // TODO: Implement actual image resizing
      const variant: MediaVariant = {
        name: sizeName,
        width: dimensions.width,
        height: dimensions.height,
        path: `${media.path.replace(/\.[^/.]+$/, '')}-${sizeName}.${media.filename.split('.').pop()}`,
        url: `${media.url.replace(/\.[^/.]+$/, '')}-${sizeName}.${media.filename.split('.').pop()}`,
        size: Math.floor(media.size * 0.5), // Placeholder - actual size would depend on compression
        format: media.mimeType.split('/')[1]
      };

      variants.push(variant);
    }

    media.variants = variants;
    const updated = await media.save();
    
    // Clear cache
    await this.cache.delete(`media:${mediaId}`);
    
    this.logger.info(`Generated ${variants.length} variants for media ${mediaId}`);
    return updated;
  }
}