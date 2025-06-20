const multer = require('multer');
const { 
  asyncHandler, 
  S3UploadError, 
  S3ValidationError,
  logInfo,
  logError 
} = require('../utils/error-handler');
const { validateFileUpload } = require('../utils/validators');

/**
 * S3 Storage Module - Upload API Handler
 * Handles file uploads to S3 storage
 */

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 5 // Maximum 5 files per request
  },
  fileFilter: (req, file, cb) => {
    // Basic file validation
    const validation = validateFileUpload(file, {
      maxSize: 50 * 1024 * 1024,
      allowedExtensions: null // Will be checked later based on config
    });
    
    if (!validation.valid) {
      return cb(new S3ValidationError(validation.errors.join(', ')));
    }
    
    cb(null, true);
  }
});

/**
 * Single file upload handler
 */
const uploadSingleFile = asyncHandler(async (req, res) => {
  try {
    logInfo('📤 Processing single file upload request');
    
    // Get the S3 storage module instance
    const s3Module = req.app.locals.s3StorageModule;
    if (!s3Module || !s3Module.isInitialized) {
      throw new S3ValidationError('S3 Storage module not initialized');
    }

    // Check if file was uploaded
    if (!req.file) {
      throw new S3ValidationError('No file uploaded');
    }

    // Extract metadata from request
    const metadata = {
      alt: req.body.alt || '',
      caption: req.body.caption || '',
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
      folder: req.body.folder || null,
      isPublic: req.body.isPublic !== 'false',
      uploadedBy: req.user?.id || 'anonymous'
    };

    // Validate file against module configuration
    const moduleConfig = s3Module.config;
    const fileValidation = validateFileUpload(req.file, {
      maxSize: moduleConfig.max_file_size || 50 * 1024 * 1024,
      allowedExtensions: moduleConfig.allowed_extensions || null
    });

    if (!fileValidation.valid) {
      throw new S3ValidationError(fileValidation.errors.join(', '));
    }

    // Prepare upload data
    const uploadData = {
      file: req.file,
      buffer: req.file.buffer,
      filename: req.file.originalname,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: metadata.uploadedBy,
      isPublic: metadata.isPublic,
      metadata: {
        alt: metadata.alt,
        caption: metadata.caption,
        tags: metadata.tags,
        folder: metadata.folder
      }
    };

    // Upload to S3
    const uploadResult = await s3Module.storageService.uploadFile(uploadData);

    // Create response
    const response = {
      success: true,
      data: {
        id: generateFileId(), // You'd generate this based on your system
        filename: uploadData.filename,
        originalName: uploadData.originalName,
        url: uploadResult.url,
        s3Key: uploadResult.key,
        size: uploadResult.size,
        mimeType: uploadData.mimeType,
        provider: uploadResult.provider,
        uploadedAt: new Date().toISOString(),
        metadata: uploadData.metadata,
        optimized: uploadResult.optimized || false
      },
      message: 'File uploaded successfully'
    };

    logInfo(`✅ File uploaded successfully: ${uploadData.filename}`);
    res.status(201).json(response);

  } catch (error) {
    logError('❌ Single file upload failed:', error);
    throw error;
  }
});

/**
 * Multiple files upload handler
 */
const uploadMultipleFiles = asyncHandler(async (req, res) => {
  try {
    logInfo(`📤 Processing multiple files upload request: ${req.files?.length || 0} files`);
    
    // Get the S3 storage module instance
    const s3Module = req.app.locals.s3StorageModule;
    if (!s3Module || !s3Module.isInitialized) {
      throw new S3ValidationError('S3 Storage module not initialized');
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      throw new S3ValidationError('No files uploaded');
    }

    // Extract common metadata
    const commonMetadata = {
      folder: req.body.folder || null,
      isPublic: req.body.isPublic !== 'false',
      uploadedBy: req.user?.id || 'anonymous'
    };

    const uploadResults = [];
    const errors = [];

    // Process each file
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      
      try {
        // File-specific metadata
        const fileMetadata = {
          ...commonMetadata,
          alt: req.body[`alt_${i}`] || '',
          caption: req.body[`caption_${i}`] || '',
          tags: req.body[`tags_${i}`] ? JSON.parse(req.body[`tags_${i}`]) : []
        };

        // Validate individual file
        const fileValidation = validateFileUpload(file, {
          maxSize: s3Module.config.max_file_size || 50 * 1024 * 1024,
          allowedExtensions: s3Module.config.allowed_extensions || null
        });

        if (!fileValidation.valid) {
          errors.push({
            filename: file.originalname,
            errors: fileValidation.errors
          });
          continue;
        }

        // Prepare upload data
        const uploadData = {
          file: file,
          buffer: file.buffer,
          filename: file.originalname,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          uploadedBy: fileMetadata.uploadedBy,
          isPublic: fileMetadata.isPublic,
          metadata: {
            alt: fileMetadata.alt,
            caption: fileMetadata.caption,
            tags: fileMetadata.tags,
            folder: fileMetadata.folder
          }
        };

        // Upload to S3
        const uploadResult = await s3Module.storageService.uploadFile(uploadData);

        uploadResults.push({
          id: generateFileId(),
          filename: uploadData.filename,
          originalName: uploadData.originalName,
          url: uploadResult.url,
          s3Key: uploadResult.key,
          size: uploadResult.size,
          mimeType: uploadData.mimeType,
          provider: uploadResult.provider,
          uploadedAt: new Date().toISOString(),
          metadata: uploadData.metadata,
          optimized: uploadResult.optimized || false
        });

        logInfo(`✅ File uploaded: ${uploadData.filename}`);

      } catch (error) {
        logError(`❌ Failed to upload ${file.originalname}:`, error);
        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    // Create response
    const response = {
      success: uploadResults.length > 0,
      data: {
        uploaded: uploadResults,
        errors: errors,
        summary: {
          total: req.files.length,
          successful: uploadResults.length,
          failed: errors.length
        }
      },
      message: `${uploadResults.length} of ${req.files.length} files uploaded successfully`
    };

    const statusCode = uploadResults.length > 0 ? 201 : 400;
    logInfo(`📊 Upload summary: ${uploadResults.length}/${req.files.length} successful`);
    
    res.status(statusCode).json(response);

  } catch (error) {
    logError('❌ Multiple files upload failed:', error);
    throw error;
  }
});

/**
 * Generate presigned upload URL for direct browser uploads
 */
const generateUploadUrl = asyncHandler(async (req, res) => {
  try {
    logInfo('🔗 Generating presigned upload URL');
    
    const s3Module = req.app.locals.s3StorageModule;
    if (!s3Module || !s3Module.isInitialized) {
      throw new S3ValidationError('S3 Storage module not initialized');
    }

    const {
      filename,
      contentType = 'application/octet-stream',
      size,
      expiresIn = 3600
    } = req.body;

    if (!filename) {
      throw new S3ValidationError('Filename is required');
    }

    // Validate file size
    const maxSize = s3Module.config.max_file_size || 50 * 1024 * 1024;
    if (size && size > maxSize) {
      throw new S3ValidationError(`File size exceeds maximum allowed size of ${maxSize} bytes`);
    }

    // Generate S3 key
    const s3Key = s3Module.fileManager.generateS3Path({
      originalName: filename,
      mimeType: contentType,
      uploadedBy: req.user?.id || 'anonymous'
    });

    // Generate presigned URL
    const uploadUrlData = await s3Module.urlService.generateUploadUrl(
      s3Module.activeProvider,
      s3Key,
      {
        expiresIn,
        contentType,
        maxFileSize: size
      }
    );

    const response = {
      success: true,
      data: {
        uploadUrl: uploadUrlData.url,
        key: s3Key,
        method: uploadUrlData.method,
        headers: uploadUrlData.headers,
        expiresIn,
        maxSize: maxSize
      },
      message: 'Presigned upload URL generated successfully'
    };

    logInfo(`🔗 Generated presigned URL for: ${filename}`);
    res.json(response);

  } catch (error) {
    logError('❌ Generate upload URL failed:', error);
    throw error;
  }
});

/**
 * Handle direct upload completion notification
 */
const confirmDirectUpload = asyncHandler(async (req, res) => {
  try {
    logInfo('✅ Processing direct upload confirmation');
    
    const s3Module = req.app.locals.s3StorageModule;
    if (!s3Module || !s3Module.isInitialized) {
      throw new S3ValidationError('S3 Storage module not initialized');
    }

    const {
      key,
      etag,
      size,
      metadata = {}
    } = req.body;

    if (!key) {
      throw new S3ValidationError('S3 key is required');
    }

    // Verify the file exists in S3
    const exists = await s3Module.activeProvider.objectExists(key);
    if (!exists) {
      throw new S3ValidationError('File not found in S3 storage');
    }

    // Get file metadata from S3
    const objectMetadata = await s3Module.activeProvider.getObjectMetadata(key);
    
    // Generate public URL
    const url = await s3Module.urlService.generateUrl(key, {
      provider: s3Module.activeProvider,
      isPrivate: false
    });

    // Create file record (you'd save this to your database)
    const fileRecord = {
      id: generateFileId(),
      filename: key.split('/').pop(),
      originalName: metadata.originalName || key.split('/').pop(),
      url: url,
      s3Key: key,
      size: objectMetadata.size || size,
      mimeType: objectMetadata.contentType || 'application/octet-stream',
      provider: s3Module.activeProvider.type,
      uploadedAt: new Date().toISOString(),
      uploadedBy: req.user?.id || 'anonymous',
      metadata: metadata,
      etag: etag || objectMetadata.etag
    };

    const response = {
      success: true,
      data: fileRecord,
      message: 'Direct upload confirmed successfully'
    };

    logInfo(`✅ Direct upload confirmed: ${key}`);
    res.json(response);

  } catch (error) {
    logError('❌ Direct upload confirmation failed:', error);
    throw error;
  }
});

/**
 * Get upload progress for chunked uploads
 */
const getUploadProgress = asyncHandler(async (req, res) => {
  try {
    const { uploadId } = req.params;
    
    // This would check the progress of a multipart upload
    // Implementation depends on your progress tracking system
    
    const response = {
      success: true,
      data: {
        uploadId,
        progress: 0,
        completed: false,
        error: null
      },
      message: 'Upload progress retrieved'
    };

    res.json(response);

  } catch (error) {
    logError('❌ Get upload progress failed:', error);
    throw error;
  }
});

/**
 * Cancel an ongoing upload
 */
const cancelUpload = asyncHandler(async (req, res) => {
  try {
    const { uploadId } = req.params;
    
    logInfo(`🗑️ Cancelling upload: ${uploadId}`);
    
    // This would cancel a multipart upload
    // Implementation depends on your upload tracking system
    
    const response = {
      success: true,
      message: 'Upload cancelled successfully'
    };

    res.json(response);

  } catch (error) {
    logError('❌ Cancel upload failed:', error);
    throw error;
  }
});

/**
 * Generate a unique file ID
 * @returns {string} Unique file ID
 */
function generateFileId() {
  return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Middleware to check upload permissions
 */
const checkUploadPermissions = asyncHandler(async (req, res, next) => {
  // Check if user has upload permissions
  if (!req.user) {
    throw new S3ValidationError('Authentication required for file upload');
  }

  // Check user role/permissions
  const userPermissions = req.user.permissions || [];
  if (!userPermissions.includes('storage.upload') && !userPermissions.includes('admin')) {
    throw new S3ValidationError('Insufficient permissions for file upload');
  }

  next();
});

// Export route handlers
module.exports = {
  // Multer middleware
  uploadMiddleware: upload,
  
  // Route handlers
  uploadSingleFile: [checkUploadPermissions, upload.single('file'), uploadSingleFile],
  uploadMultipleFiles: [checkUploadPermissions, upload.array('files', 5), uploadMultipleFiles],
  generateUploadUrl: [checkUploadPermissions, generateUploadUrl],
  confirmDirectUpload: [checkUploadPermissions, confirmDirectUpload],
  getUploadProgress: [checkUploadPermissions, getUploadProgress],
  cancelUpload: [checkUploadPermissions, cancelUpload],
  
  // Individual functions for testing
  _uploadSingleFile: uploadSingleFile,
  _uploadMultipleFiles: uploadMultipleFiles,
  _generateUploadUrl: generateUploadUrl,
  _confirmDirectUpload: confirmDirectUpload
};