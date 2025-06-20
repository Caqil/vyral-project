const { logInfo, logError, logWarning } = require('../utils/error-handler');

/**
 * S3 Storage Module - Media Delete Hook
 * Handles media deletion hooks for S3 storage integration
 */

class MediaDeleteHook {
  constructor(s3Module) {
    this.s3Module = s3Module;
    this.config = s3Module.config;
    
    // Hook priorities (lower numbers execute first)
    this.beforeDeletePriority = 10;
    this.afterDeletePriority = 10;
    
    logInfo('🪝 Media Delete Hook initialized');
  }

  /**
   * Hook: Before file deletion
   * Prepares and validates file deletion from S3
   * @param {object} deleteData - Deletion data
   * @returns {Promise<object>} Modified deletion data
   */
  async beforeDelete(deleteData) {
    try {
      logInfo(`🔄 Processing before delete: ${deleteData.filename || deleteData.id || 'unknown'}`);
      
      // Skip if S3 is not configured
      if (!this.s3Module.isInitialized || !this.s3Module.activeProvider) {
        logInfo('📁 S3 not configured, skipping S3 delete preparation');
        return deleteData;
      }

      // Validate deletion data
      if (!deleteData.id && !deleteData.s3Key && !deleteData.filename) {
        logWarning('⚠️ Insufficient data for S3 deletion');
        return deleteData;
      }

      // Get file information from database if only ID is provided
      if (deleteData.id && !deleteData.s3Key) {
        deleteData = await this.enrichDeleteDataFromDatabase(deleteData);
      }

      // Validate S3 key
      if (deleteData.s3Key) {
        const keyValidation = this.validateS3Key(deleteData.s3Key);
        if (!keyValidation.valid) {
          logWarning(`⚠️ Invalid S3 key: ${keyValidation.errors.join(', ')}`);
          deleteData.s3KeyValid = false;
        } else {
          deleteData.s3KeyValid = true;
        }
      }

      // Check if file exists in S3
      if (deleteData.s3Key && deleteData.s3KeyValid) {
        try {
          deleteData.s3Exists = await this.s3Module.activeProvider.objectExists(deleteData.s3Key);
          if (deleteData.s3Exists) {
            // Get file metadata before deletion for audit logging
            deleteData.s3Metadata = await this.s3Module.activeProvider.getObjectMetadata(deleteData.s3Key);
          }
        } catch (error) {
          logWarning('⚠️ Failed to check S3 file existence:', error);
          deleteData.s3Exists = false;
        }
      }

      // Prepare backup operation if enabled
      if (this.config.backup_before_delete && deleteData.s3Exists) {
        deleteData.shouldBackup = true;
        deleteData.backupKey = this.generateBackupKey(deleteData.s3Key);
      }

      // Add S3-specific deletion metadata
      deleteData.s3DeleteMetadata = {
        provider: this.s3Module.activeProvider?.type,
        timestamp: new Date().toISOString(),
        deletedVia: 'vyral-cms-s3-module',
        backupEnabled: deleteData.shouldBackup || false
      };

      logInfo(`✅ Before delete processing completed: ${deleteData.s3Key || 'no S3 key'}`);
      return deleteData;

    } catch (error) {
      logError('❌ Before delete hook failed:', error);
      
      // Add error details but don't fail the deletion
      deleteData.s3Error = {
        stage: 'before-delete',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      
      return deleteData;
    }
  }

  /**
   * Hook: After file deletion
   * Handles S3 file deletion after local deletion
   * @param {object} deleteResult - Deletion result
   * @returns {Promise<object>} Modified deletion result
   */
  async afterDelete(deleteResult) {
    try {
      logInfo(`🔄 Processing after delete: ${deleteResult.filename || deleteResult.id || 'unknown'}`);
      
      // Skip if S3 is not configured
      if (!this.s3Module.isInitialized || !this.s3Module.activeProvider) {
        logInfo('📁 S3 not configured, skipping S3 deletion');
        return deleteResult;
      }

      // Skip if local deletion failed
      if (!deleteResult.success) {
        logWarning('⚠️ Local deletion failed, skipping S3 deletion');
        return deleteResult;
      }

      // Skip if no S3 key available
      if (!deleteResult.s3Key || !deleteResult.s3KeyValid) {
        logInfo('📁 No valid S3 key, skipping S3 deletion');
        deleteResult.s3 = {
          deleted: false,
          reason: 'No valid S3 key available'
        };
        return deleteResult;
      }

      // Backup file if required
      if (deleteResult.shouldBackup && deleteResult.s3Exists) {
        await this.backupFileBeforeDelete(deleteResult);
      }

      // Delete from S3
      const s3DeleteResult = await this.deleteFromS3(deleteResult);
      
      // Merge S3 results with delete result
      deleteResult.s3 = s3DeleteResult;

      // Delete from backup provider if configured
      if (this.s3Module.backupProvider && s3DeleteResult.success) {
        try {
          await this.deleteFromBackupProvider(deleteResult);
          deleteResult.s3.backupDeleted = true;
        } catch (error) {
          logWarning('⚠️ Failed to delete from backup provider:', error);
          deleteResult.s3.backupDeleted = false;
          deleteResult.s3.backupError = error.message;
        }
      }

      // Clean up any related files (thumbnails, variants)
      if (s3DeleteResult.success && this.config.delete_variants) {
        await this.deleteFileVariants(deleteResult);
      }

      // Update analytics
      if (this.config.enable_analytics) {
        await this.recordDeletionAnalytics(deleteResult);
      }

      logInfo(`✅ After delete processing completed: ${deleteResult.s3?.deleted ? 'deleted' : 'not deleted'}`);
      return deleteResult;

    } catch (error) {
      logError('❌ After delete hook failed:', error);
      
      // Add S3 error info but don't fail the entire deletion
      deleteResult.s3Error = {
        stage: 'after-delete',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      
      return deleteResult;
    }
  }

  /**
   * Enrich delete data from database
   * @param {object} deleteData - Deletion data with ID
   * @returns {Promise<object>} Enriched deletion data
   */
  async enrichDeleteDataFromDatabase(deleteData) {
    try {
      // This would query your database for file information
      // Implementation depends on your database structure
      
      // Placeholder implementation
      const fileRecord = await this.getFileRecordById(deleteData.id);
      
      if (fileRecord) {
        deleteData = {
          ...deleteData,
          filename: fileRecord.filename,
          s3Key: fileRecord.s3Key,
          size: fileRecord.size,
          mimeType: fileRecord.mimeType,
          uploadedBy: fileRecord.uploadedBy,
          provider: fileRecord.provider
        };
      }

      return deleteData;

    } catch (error) {
      logError('❌ Failed to enrich delete data from database:', error);
      return deleteData;
    }
  }

  /**
   * Validate S3 key format
   * @param {string} s3Key - S3 object key
   * @returns {object} Validation result
   */
  validateS3Key(s3Key) {
    const errors = [];

    if (!s3Key || typeof s3Key !== 'string') {
      errors.push('S3 key must be a non-empty string');
      return { valid: false, errors };
    }

    // Check key length
    if (s3Key.length > 1024) {
      errors.push('S3 key cannot exceed 1024 characters');
    }

    // Check for invalid characters
    const invalidChars = ['\r', '\n', '\x00'];
    for (const char of invalidChars) {
      if (s3Key.includes(char)) {
        errors.push('S3 key contains invalid characters');
        break;
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate backup key for file
   * @param {string} originalKey - Original S3 key
   * @returns {string} Backup key
   */
  generateBackupKey(originalKey) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFolder = this.config.backup_folder || 'deleted-backups';
    return `${backupFolder}/${timestamp}/${originalKey}`;
  }

  /**
   * Backup file before deletion
   * @param {object} deleteResult - Deletion result
   * @returns {Promise<void>}
   */
  async backupFileBeforeDelete(deleteResult) {
    try {
      logInfo(`💾 Backing up file before deletion: ${deleteResult.s3Key}`);
      
      // Copy file to backup location
      const { CopyObjectCommand } = require('@aws-sdk/client-s3');
      const copyCommand = new CopyObjectCommand({
        Bucket: this.s3Module.activeProvider.config.bucket_name,
        CopySource: `${this.s3Module.activeProvider.config.bucket_name}/${deleteResult.s3Key}`,
        Key: deleteResult.backupKey,
        Metadata: {
          ...deleteResult.s3Metadata?.metadata,
          'backup-timestamp': new Date().toISOString(),
          'original-key': deleteResult.s3Key,
          'deleted-by': deleteResult.deletedBy || 'unknown'
        },
        MetadataDirective: 'REPLACE'
      });

      await this.s3Module.activeProvider.client.send(copyCommand);
      deleteResult.backedUp = true;
      
      logInfo(`✅ File backed up to: ${deleteResult.backupKey}`);

    } catch (error) {
      logError('❌ File backup failed:', error);
      deleteResult.backedUp = false;
      deleteResult.backupError = error.message;
      
      // Don't fail deletion if backup fails
      logWarning('⚠️ Continuing with deletion despite backup failure');
    }
  }

  /**
   * Delete file from S3
   * @param {object} deleteResult - Deletion result
   * @returns {Promise<object>} S3 deletion result
   */
  async deleteFromS3(deleteResult) {
    try {
      logInfo(`🗑️ Deleting from S3: ${deleteResult.s3Key}`);
      
      // Delete using S3 storage service
      const result = await this.s3Module.storageService.deleteFile(deleteResult.s3Key);
      
      return {
        deleted: true,
        key: deleteResult.s3Key,
        provider: result.provider,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logError('❌ S3 deletion failed:', error);
      
      return {
        deleted: false,
        error: error.message,
        key: deleteResult.s3Key,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Delete from backup provider
   * @param {object} deleteResult - Deletion result
   * @returns {Promise<void>}
   */
  async deleteFromBackupProvider(deleteResult) {
    try {
      if (!this.s3Module.backupProvider) {
        return;
      }

      logInfo(`🗑️ Deleting from backup provider: ${deleteResult.s3Key}`);
      
      await this.s3Module.backupProvider.deleteFile(deleteResult.s3Key);
      
      logInfo(`✅ Deleted from backup provider: ${deleteResult.s3Key}`);

    } catch (error) {
      logError('❌ Backup provider deletion failed:', error);
      throw error;
    }
  }

  /**
   * Delete file variants (thumbnails, optimized versions)
   * @param {object} deleteResult - Deletion result
   * @returns {Promise<void>}
   */
  async deleteFileVariants(deleteResult) {
    try {
      const baseKey = deleteResult.s3Key;
      const extension = baseKey.split('.').pop();
      const baseName = baseKey.substring(0, baseKey.lastIndexOf('.'));
      
      // Common variant patterns
      const variantPatterns = [
        `${baseName}-thumbnail.${extension}`,
        `${baseName}-small.${extension}`,
        `${baseName}-medium.${extension}`,
        `${baseName}-large.${extension}`,
        `${baseName}-optimized.${extension}`
      ];

      const deletionPromises = variantPatterns.map(async (variantKey) => {
        try {
          const exists = await this.s3Module.activeProvider.objectExists(variantKey);
          if (exists) {
            await this.s3Module.activeProvider.deleteFile(variantKey);
            logInfo(`🗑️ Deleted variant: ${variantKey}`);
          }
        } catch (error) {
          logWarning(`⚠️ Failed to delete variant ${variantKey}:`, error);
        }
      });

      await Promise.all(deletionPromises);

    } catch (error) {
      logError('❌ Delete file variants failed:', error);
    }
  }

  /**
   * Record deletion analytics
   * @param {object} deleteResult - Deletion result
   * @returns {Promise<void>}
   */
  async recordDeletionAnalytics(deleteResult) {
    try {
      const analytics = {
        timestamp: new Date().toISOString(),
        filename: deleteResult.filename,
        s3Key: deleteResult.s3Key,
        size: deleteResult.size,
        provider: deleteResult.s3?.provider,
        success: deleteResult.s3?.deleted || false,
        backedUp: deleteResult.backedUp || false,
        deletedBy: deleteResult.deletedBy,
        reason: deleteResult.reason || 'user-initiated'
      };

      // Log analytics (implementation depends on your analytics system)
      logInfo(`📊 Deletion analytics: ${JSON.stringify(analytics)}`);

    } catch (error) {
      logWarning('⚠️ Failed to record deletion analytics:', error);
    }
  }

  /**
   * Get file record by ID from database (placeholder)
   * @param {string} id - File ID
   * @returns {Promise<object|null>} File record
   */
  async getFileRecordById(id) {
    // This would query your database for the file record
    // Implementation depends on your database structure
    
    try {
      // Placeholder implementation
      // In a real implementation, you'd query your media/files table
      return null;
    } catch (error) {
      logError('❌ Get file record by ID failed:', error);
      return null;
    }
  }

  /**
   * Handle deletion error
   * @param {Error} error - Deletion error
   * @param {object} deleteData - Deletion data
   * @returns {object} Error response
   */
  handleDeletionError(error, deleteData) {
    logError('❌ Deletion error handled:', error);
    
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code || 'DELETE_ERROR',
        stage: 's3-delete',
        key: deleteData.s3Key,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Get hook configuration
   * @returns {object} Hook configuration
   */
  getHookConfig() {
    return {
      name: 'MediaDeleteHook',
      version: '1.0.0',
      hooks: [
        {
          name: 'media:before-delete',
          handler: this.beforeDelete.bind(this),
          priority: this.beforeDeletePriority
        },
        {
          name: 'media:after-delete',
          handler: this.afterDelete.bind(this),
          priority: this.afterDeletePriority
        }
      ],
      config: {
        enabled: this.s3Module.isInitialized,
        provider: this.s3Module.activeProvider?.type || 'none',
        backupEnabled: this.config.backup_before_delete || false
      }
    };
  }
}

module.exports = MediaDeleteHook;