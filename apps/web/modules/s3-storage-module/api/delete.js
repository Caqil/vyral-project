const { 
  asyncHandler, 
  S3ValidationError,
  S3NotFoundError,
  logInfo,
  logError 
} = require('../utils/error-handler');
const { validateS3Key } = require('../utils/validators');

/**
 * S3 Storage Module - Delete API Handler
 * Handles file deletions from S3 storage
 */

/**
 * Delete a single file by S3 key
 */
const deleteFileByKey = asyncHandler(async (req, res) => {
  try {
    const { key } = req.params;
    
    logInfo(`🗑️ Processing delete request for key: ${key}`);
    
    // Get the S3 storage module instance
    const s3Module = req.app.locals.s3StorageModule;
    if (!s3Module || !s3Module.isInitialized) {
      throw new S3ValidationError('S3 Storage module not initialized');
    }

    // Validate S3 key
    const keyValidation = validateS3Key(key);
    if (!keyValidation.valid) {
      throw new S3ValidationError(`Invalid S3 key: ${keyValidation.errors.join(', ')}`);
    }

    // Check if file exists
    const exists = await s3Module.activeProvider.objectExists(key);
    if (!exists) {
      throw new S3NotFoundError(`File not found: ${key}`, key);
    }

    // Get file metadata before deletion (for logging/audit)
    let fileMetadata = null;
    try {
      const metadata = await s3Module.activeProvider.getObjectMetadata(key);
      fileMetadata = metadata.success ? metadata : null;
    } catch (error) {
      logError('⚠️ Could not retrieve file metadata before deletion:', error);
    }

    // Delete from S3
    const deleteResult = await s3Module.storageService.deleteFile(key);

    // Log the deletion for audit purposes
    if (s3Module.config.enable_analytics) {
      await logFileDeletion({
        key,
        deletedBy: req.user?.id || 'anonymous',
        fileSize: fileMetadata?.size || 0,
        provider: deleteResult.provider,
        timestamp: new Date().toISOString()
      });
    }

    const response = {
      success: true,
      data: {
        key: key,
        deleted: true,
        provider: deleteResult.provider,
        deletedAt: new Date().toISOString(),
        deletedBy: req.user?.id || 'anonymous'
      },
      message: 'File deleted successfully'
    };

    logInfo(`✅ File deleted successfully: ${key}`);
    res.json(response);

  } catch (error) {
    logError('❌ File deletion failed:', error);
    throw error;
  }
});

/**
 * Delete a file by database ID
 */
const deleteFileById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    logInfo(`🗑️ Processing delete request for file ID: ${id}`);
    
    // Get the S3 storage module instance
    const s3Module = req.app.locals.s3StorageModule;
    if (!s3Module || !s3Module.isInitialized) {
      throw new S3ValidationError('S3 Storage module not initialized');
    }

    // Get file record from database (you'd implement this based on your database)
    const fileRecord = await getFileRecordById(id);
    if (!fileRecord) {
      throw new S3NotFoundError(`File record not found: ${id}`);
    }

    // Check if user has permission to delete this file
    if (!canUserDeleteFile(req.user, fileRecord)) {
      throw new S3ValidationError('Insufficient permissions to delete this file');
    }

    // Delete from S3 if S3 key exists
    let s3DeleteResult = null;
    if (fileRecord.s3Key) {
      try {
        s3DeleteResult = await s3Module.storageService.deleteFile(fileRecord.s3Key);
        logInfo(`✅ File deleted from S3: ${fileRecord.s3Key}`);
      } catch (error) {
        logError(`⚠️ Failed to delete from S3 (continuing with database deletion): ${error.message}`);
      }
    }

    // Delete file record from database
    await deleteFileRecordById(id);

    // Log the deletion
    if (s3Module.config.enable_analytics) {
      await logFileDeletion({
        id,
        key: fileRecord.s3Key,
        filename: fileRecord.filename,
        deletedBy: req.user?.id || 'anonymous',
        fileSize: fileRecord.size || 0,
        provider: s3DeleteResult?.provider || fileRecord.provider,
        timestamp: new Date().toISOString()
      });
    }

    const response = {
      success: true,
      data: {
        id: id,
        key: fileRecord.s3Key,
        filename: fileRecord.filename,
        deleted: true,
        s3Deleted: !!s3DeleteResult,
        deletedAt: new Date().toISOString(),
        deletedBy: req.user?.id || 'anonymous'
      },
      message: 'File deleted successfully'
    };

    logInfo(`✅ File record deleted: ${id}`);
    res.json(response);

  } catch (error) {
    logError('❌ File deletion by ID failed:', error);
    throw error;
  }
});

/**
 * Bulk delete multiple files
 */
const bulkDeleteFiles = asyncHandler(async (req, res) => {
  try {
    const { keys, ids } = req.body;
    
    if (!keys && !ids) {
      throw new S3ValidationError('Either keys or ids must be provided');
    }

    if (keys && ids) {
      throw new S3ValidationError('Provide either keys or ids, not both');
    }

    const itemsToDelete = keys || ids;
    const isKeyBased = !!keys;
    
    logInfo(`🗑️ Processing bulk delete request: ${itemsToDelete.length} items (${isKeyBased ? 'by key' : 'by ID'})`);
    
    // Get the S3 storage module instance
    const s3Module = req.app.locals.s3StorageModule;
    if (!s3Module || !s3Module.isInitialized) {
      throw new S3ValidationError('S3 Storage module not initialized');
    }

    const results = {
      successful: [],
      failed: [],
      summary: {
        total: itemsToDelete.length,
        deleted: 0,
        errors: 0
      }
    };

    // Process each item
    for (const item of itemsToDelete) {
      try {
        if (isKeyBased) {
          // Delete by S3 key
          const keyValidation = validateS3Key(item);
          if (!keyValidation.valid) {
            throw new Error(`Invalid S3 key: ${keyValidation.errors.join(', ')}`);
          }

          const deleteResult = await s3Module.storageService.deleteFile(item);
          
          results.successful.push({
            key: item,
            deleted: true,
            provider: deleteResult.provider
          });
        } else {
          // Delete by database ID
          const fileRecord = await getFileRecordById(item);
          if (!fileRecord) {
            throw new Error(`File record not found: ${item}`);
          }

          // Check permissions
          if (!canUserDeleteFile(req.user, fileRecord)) {
            throw new Error('Insufficient permissions to delete this file');
          }

          // Delete from S3
          let s3DeleteResult = null;
          if (fileRecord.s3Key) {
            try {
              s3DeleteResult = await s3Module.storageService.deleteFile(fileRecord.s3Key);
            } catch (error) {
              logError(`⚠️ S3 deletion failed for ${fileRecord.s3Key}: ${error.message}`);
            }
          }

          // Delete from database
          await deleteFileRecordById(item);

          results.successful.push({
            id: item,
            key: fileRecord.s3Key,
            filename: fileRecord.filename,
            deleted: true,
            s3Deleted: !!s3DeleteResult
          });
        }

        results.summary.deleted++;
        logInfo(`✅ Deleted: ${item}`);

      } catch (error) {
        results.failed.push({
          item: item,
          error: error.message
        });
        results.summary.errors++;
        logError(`❌ Failed to delete ${item}:`, error);
      }
    }

    // Log bulk operation
    if (s3Module.config.enable_analytics) {
      await logBulkDeletion({
        type: isKeyBased ? 'keys' : 'ids',
        total: itemsToDelete.length,
        successful: results.summary.deleted,
        failed: results.summary.errors,
        deletedBy: req.user?.id || 'anonymous',
        timestamp: new Date().toISOString()
      });
    }

    const response = {
      success: results.summary.deleted > 0,
      data: results,
      message: `${results.summary.deleted} of ${results.summary.total} files deleted successfully`
    };

    logInfo(`📊 Bulk delete completed: ${results.summary.deleted}/${results.summary.total} successful`);
    res.json(response);

  } catch (error) {
    logError('❌ Bulk delete failed:', error);
    throw error;
  }
});

/**
 * Delete files by prefix (folder)
 */
const deleteByPrefix = asyncHandler(async (req, res) => {
  try {
    const { prefix } = req.body;
    
    if (!prefix) {
      throw new S3ValidationError('Prefix is required');
    }

    logInfo(`🗑️ Processing delete by prefix: ${prefix}`);
    
    // Get the S3 storage module instance
    const s3Module = req.app.locals.s3StorageModule;
    if (!s3Module || !s3Module.isInitialized) {
      throw new S3ValidationError('S3 Storage module not initialized');
    }

    // List objects with the prefix
    const listResult = await s3Module.activeProvider.listObjects({
      prefix: prefix,
      maxKeys: 1000
    });

    if (!listResult.objects || listResult.objects.length === 0) {
      const response = {
        success: true,
        data: {
          prefix: prefix,
          deleted: 0,
          files: []
        },
        message: 'No files found with the specified prefix'
      };
      
      return res.json(response);
    }

    const results = {
      successful: [],
      failed: [],
      summary: {
        total: listResult.objects.length,
        deleted: 0,
        errors: 0
      }
    };

    // Delete each object
    for (const object of listResult.objects) {
      try {
        const deleteResult = await s3Module.storageService.deleteFile(object.Key);
        
        results.successful.push({
          key: object.Key,
          size: object.Size,
          deleted: true,
          provider: deleteResult.provider
        });
        
        results.summary.deleted++;
        logInfo(`✅ Deleted: ${object.Key}`);

      } catch (error) {
        results.failed.push({
          key: object.Key,
          error: error.message
        });
        results.summary.errors++;
        logError(`❌ Failed to delete ${object.Key}:`, error);
      }
    }

    // Log prefix deletion
    if (s3Module.config.enable_analytics) {
      await logPrefixDeletion({
        prefix,
        total: listResult.objects.length,
        successful: results.summary.deleted,
        failed: results.summary.errors,
        deletedBy: req.user?.id || 'anonymous',
        timestamp: new Date().toISOString()
      });
    }

    const response = {
      success: results.summary.deleted > 0,
      data: {
        prefix: prefix,
        ...results
      },
      message: `${results.summary.deleted} of ${results.summary.total} files deleted from prefix`
    };

    logInfo(`📊 Prefix delete completed: ${results.summary.deleted}/${results.summary.total} successful`);
    res.json(response);

  } catch (error) {
    logError('❌ Delete by prefix failed:', error);
    throw error;
  }
});

/**
 * Get deletion status/history
 */
const getDeletionHistory = asyncHandler(async (req, res) => {
  try {
    const { limit = 50, offset = 0, userId = null } = req.query;
    
    // Get deletion history from your logging system
    const history = await getDeletionLogHistory({
      limit: parseInt(limit),
      offset: parseInt(offset),
      userId: userId
    });

    const response = {
      success: true,
      data: history,
      message: 'Deletion history retrieved successfully'
    };

    res.json(response);

  } catch (error) {
    logError('❌ Get deletion history failed:', error);
    throw error;
  }
});

// Helper functions (you'd implement these based on your database)

/**
 * Get file record by ID from database
 * @param {string} id - File ID
 * @returns {object|null} File record
 */
async function getFileRecordById(id) {
  // Implementation depends on your database
  // This is a placeholder
  return null;
}

/**
 * Delete file record from database
 * @param {string} id - File ID
 * @returns {Promise<void>}
 */
async function deleteFileRecordById(id) {
  // Implementation depends on your database
  // This is a placeholder
}

/**
 * Check if user can delete a file
 * @param {object} user - User object
 * @param {object} fileRecord - File record
 * @returns {boolean} True if user can delete
 */
function canUserDeleteFile(user, fileRecord) {
  if (!user) return false;
  
  // Admin can delete any file
  if (user.role === 'admin') return true;
  
  // User can delete their own files
  if (fileRecord.uploadedBy === user.id) return true;
  
  // Check specific permissions
  const permissions = user.permissions || [];
  if (permissions.includes('storage.delete') || permissions.includes('storage.admin')) {
    return true;
  }
  
  return false;
}

/**
 * Log file deletion for analytics
 * @param {object} data - Deletion data
 */
async function logFileDeletion(data) {
  // Implementation depends on your analytics system
  logInfo(`📊 File deletion logged: ${data.key || data.id}`);
}

/**
 * Log bulk deletion operation
 * @param {object} data - Bulk deletion data
 */
async function logBulkDeletion(data) {
  // Implementation depends on your analytics system
  logInfo(`📊 Bulk deletion logged: ${data.successful}/${data.total} files`);
}

/**
 * Log prefix deletion operation
 * @param {object} data - Prefix deletion data
 */
async function logPrefixDeletion(data) {
  // Implementation depends on your analytics system
  logInfo(`📊 Prefix deletion logged: ${data.prefix}`);
}

/**
 * Get deletion history from logs
 * @param {object} options - Query options
 * @returns {Promise<object>} Deletion history
 */
async function getDeletionLogHistory(options) {
  // Implementation depends on your logging system
  return {
    deletions: [],
    pagination: {
      limit: options.limit,
      offset: options.offset,
      total: 0
    }
  };
}

/**
 * Middleware to check delete permissions
 */
const checkDeletePermissions = asyncHandler(async (req, res, next) => {
  // Check if user has delete permissions
  if (!req.user) {
    throw new S3ValidationError('Authentication required for file deletion');
  }

  // Check user role/permissions
  const userPermissions = req.user.permissions || [];
  const hasDeletePermission = userPermissions.includes('storage.delete') || 
                             userPermissions.includes('storage.admin') ||
                             req.user.role === 'admin';

  if (!hasDeletePermission) {
    throw new S3ValidationError('Insufficient permissions for file deletion');
  }

  next();
});

// Export route handlers
module.exports = {
  // Route handlers with middleware
  deleteFileByKey: [checkDeletePermissions, deleteFileByKey],
  deleteFileById: [checkDeletePermissions, deleteFileById],
  bulkDeleteFiles: [checkDeletePermissions, bulkDeleteFiles],
  deleteByPrefix: [checkDeletePermissions, deleteByPrefix],
  getDeletionHistory: [checkDeletePermissions, getDeletionHistory],
  
  // Individual functions for testing
  _deleteFileByKey: deleteFileByKey,
  _deleteFileById: deleteFileById,
  _bulkDeleteFiles: bulkDeleteFiles,
  _deleteByPrefix: deleteByPrefix,
  _getDeletionHistory: getDeletionHistory
};