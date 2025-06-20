const { logError, logInfo, logWarning } = require('../utils/error-handler');

/**
 * Main S3 Storage Service
 * Coordinates between providers, file manager, and URL service
 */
class S3StorageService {
  constructor(options = {}) {
    this.config = options.config || {};
    this.provider = options.provider;
    this.backupProvider = options.backupProvider;
    this.fileManager = options.fileManager;
    this.urlService = options.urlService;
    
    // Statistics
    this.stats = {
      uploads: 0,
      downloads: 0,
      deletes: 0,
      errors: 0,
      bytesUploaded: 0,
      bytesDownloaded: 0
    };
    
    // Processing queue for batch operations
    this.processingQueue = [];
    this.isProcessing = false;
    
    logInfo('🗄️ S3 Storage Service initialized');
  }

  /**
   * Upload a file to S3 storage
   * @param {object} uploadData - Upload data from media upload
   * @returns {Promise<object>} Upload result
   */
  async uploadFile(uploadData) {
    try {
      logInfo(`📤 Starting S3 upload for: ${uploadData.filename || 'unknown'}`);
      
      if (!this.provider) {
        throw new Error('No S3 provider configured');
      }

      // Generate S3 key using file manager
      const s3Key = this.fileManager.generateS3Path(uploadData.file || uploadData);
      
      // Prepare upload options
      const uploadOptions = {
        contentType: uploadData.mimeType || uploadData.contentType,
        metadata: {
          originalName: uploadData.originalName || uploadData.filename,
          uploadedBy: uploadData.uploadedBy,
          uploadTimestamp: new Date().toISOString(),
          vyralCmsVersion: '1.0.0'
        },
        isPublic: uploadData.isPublic !== false,
        tags: {
          source: 'vyral-cms',
          uploadDate: new Date().toISOString().split('T')[0]
        }
      };

      // Add cache control based on file type
      uploadOptions.cacheControl = this.fileManager.getCacheControl(s3Key);

      // Optimize file if configured
      let fileData = uploadData.buffer || uploadData.file;
      if (this.config.auto_optimize_images && this.fileManager.isImage(uploadData)) {
        fileData = await this.fileManager.optimizeImage(fileData, {
          quality: this.config.image_quality || 85,
          maxWidth: this.config.max_image_width || 2048,
          maxHeight: this.config.max_image_height || 2048
        });
        logInfo(`🎨 Image optimized: ${uploadData.filename}`);
      }

      // Upload to primary provider
      const uploadResult = await this.provider.uploadFile(fileData, s3Key, uploadOptions);
      
      // Upload to backup provider if configured
      let backupResult = null;
      if (this.backupProvider) {
        try {
          backupResult = await this.backupProvider.uploadFile(fileData, s3Key, uploadOptions);
          logInfo(`💾 Backup upload successful: ${s3Key}`);
        } catch (backupError) {
          logWarning(`⚠️ Backup upload failed: ${backupError.message}`);
          // Don't fail main upload if backup fails
        }
      }

      // Update statistics
      this.stats.uploads++;
      this.stats.bytesUploaded += uploadResult.size || 0;

      // Log analytics if enabled
      if (this.config.enable_analytics) {
        await this.logFileOperation('upload', {
          key: s3Key,
          size: uploadResult.size,
          provider: this.provider.type,
          backup: !!backupResult
        });
      }

      logInfo(`✅ S3 upload completed: ${uploadResult.url}`);

      return {
        success: true,
        url: uploadResult.url,
        key: s3Key,
        size: uploadResult.size,
        provider: this.provider.type,
        backup: !!backupResult,
        etag: uploadResult.etag,
        optimized: this.config.auto_optimize_images && this.fileManager.isImage(uploadData)
      };

    } catch (error) {
      this.stats.errors++;
      logError('❌ S3 upload failed:', error);
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  /**
   * Delete a file from S3 storage
   * @param {string} s3Key - S3 object key
   * @returns {Promise<object>} Delete result
   */
  async deleteFile(s3Key) {
    try {
      logInfo(`🗑️ Deleting S3 file: ${s3Key}`);
      
      if (!this.provider) {
        throw new Error('No S3 provider configured');
      }

      // Delete from primary provider
      const deleteResult = await this.provider.deleteFile(s3Key);
      
      // Delete from backup provider if configured
      let backupDeleted = false;
      if (this.backupProvider) {
        try {
          await this.backupProvider.deleteFile(s3Key);
          backupDeleted = true;
          logInfo(`💾 Backup file deleted: ${s3Key}`);
        } catch (backupError) {
          logWarning(`⚠️ Backup delete failed: ${backupError.message}`);
          // Don't fail main delete if backup fails
        }
      }

      // Update statistics
      this.stats.deletes++;

      // Log analytics if enabled
      if (this.config.enable_analytics) {
        await this.logFileOperation('delete', {
          key: s3Key,
          provider: this.provider.type,
          backup: backupDeleted
        });
      }

      logInfo(`✅ S3 file deleted: ${s3Key}`);

      return {
        success: true,
        key: s3Key,
        provider: this.provider.type,
        backup: backupDeleted
      };

    } catch (error) {
      this.stats.errors++;
      logError('❌ S3 delete failed:', error);
      throw new Error(`S3 delete failed: ${error.message}`);
    }
  }

  /**
   * Generate a URL for accessing a file
   * @param {string} s3Key - S3 object key
   * @param {object} options - URL generation options
   * @returns {Promise<string>} File URL
   */
  async generateUrl(s3Key, options = {}) {
    try {
      if (!this.provider) {
        throw new Error('No S3 provider configured');
      }

      // Use URL service to generate appropriate URL
      const url = await this.urlService.generateUrl(s3Key, {
        provider: this.provider,
        isPrivate: options.isPrivate || false,
        expiresIn: options.expiresIn || this.config.signed_url_expiry * 60, // Convert minutes to seconds
        ...options
      });

      // Update download statistics
      if (!options.skipStats) {
        this.stats.downloads++;
      }

      return url;

    } catch (error) {
      this.stats.errors++;
      logError('❌ URL generation failed:', error);
      throw new Error(`URL generation failed: ${error.message}`);
    }
  }

  /**
   * Migrate files from local storage to S3
   * @param {object} options - Migration options
   * @returns {Promise<object>} Migration result
   */
  async migrateFromLocal(options = {}) {
    try {
      logInfo('🚚 Starting migration from local storage to S3...');
      
      if (!this.provider) {
        throw new Error('No S3 provider configured');
      }

      const {
        batchSize = 10,
        dryRun = false,
        filter = null,
        onProgress = null
      } = options;

      // Get files to migrate (this would integrate with your media database)
      const filesToMigrate = await this.getLocalFiles(filter);
      logInfo(`📁 Found ${filesToMigrate.length} files to migrate`);

      const results = {
        total: filesToMigrate.length,
        migrated: 0,
        skipped: 0,
        errors: 0,
        details: []
      };

      // Process files in batches
      for (let i = 0; i < filesToMigrate.length; i += batchSize) {
        const batch = filesToMigrate.slice(i, i + batchSize);
        
        for (const fileInfo of batch) {
          try {
            if (dryRun) {
              logInfo(`[DRY RUN] Would migrate: ${fileInfo.path}`);
              results.skipped++;
            } else {
              const migrationResult = await this.migrateLocalFile(fileInfo);
              results.migrated++;
              results.details.push(migrationResult);
              logInfo(`✅ Migrated: ${fileInfo.path} -> ${migrationResult.s3Key}`);
            }
            
            // Report progress
            if (onProgress) {
              onProgress({
                total: results.total,
                completed: results.migrated + results.skipped,
                current: fileInfo.path
              });
            }
            
          } catch (error) {
            results.errors++;
            results.details.push({
              file: fileInfo.path,
              error: error.message
            });
            logError(`❌ Migration failed for ${fileInfo.path}:`, error);
          }
        }
        
        // Small delay between batches to avoid overwhelming the system
        if (i + batchSize < filesToMigrate.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      logInfo(`🎉 Migration completed: ${results.migrated} migrated, ${results.errors} errors`);

      return {
        success: true,
        results,
        dryRun
      };

    } catch (error) {
      logError('❌ Migration failed:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  /**
   * Migrate a single local file to S3
   * @param {object} fileInfo - Local file information
   * @returns {Promise<object>} Migration result
   */
  async migrateLocalFile(fileInfo) {
    const fs = require('fs').promises;
    const path = require('path');

    // Read local file
    const fileData = await fs.readFile(fileInfo.path);
    
    // Generate S3 key
    const s3Key = this.fileManager.generateS3PathFromLocal(fileInfo.path);
    
    // Prepare upload options
    const uploadOptions = {
      contentType: fileInfo.mimeType,
      metadata: {
        originalPath: fileInfo.path,
        migratedAt: new Date().toISOString(),
        migrationSource: 'local-storage'
      },
      isPublic: fileInfo.isPublic !== false
    };

    // Upload to S3
    const uploadResult = await this.provider.uploadFile(fileData, s3Key, uploadOptions);
    
    // Upload to backup if configured
    if (this.backupProvider) {
      try {
        await this.backupProvider.uploadFile(fileData, s3Key, uploadOptions);
      } catch (backupError) {
        logWarning(`⚠️ Backup upload failed during migration: ${backupError.message}`);
      }
    }

    return {
      localPath: fileInfo.path,
      s3Key: s3Key,
      s3Url: uploadResult.url,
      size: uploadResult.size,
      migrated: true
    };
  }

  /**
   * Get list of local files to migrate
   * @param {function} filter - Optional filter function
   * @returns {Promise<Array>} Array of file information
   */
  async getLocalFiles(filter = null) {
    // This would integrate with your media database
    // For now, return a placeholder implementation
    
    // In a real implementation, you'd query your database for media files
    // that are stored locally and need to be migrated
    
    return [
      // Example structure:
      // {
      //   path: '/uploads/image.jpg',
      //   mimeType: 'image/jpeg',
      //   size: 1024000,
      //   isPublic: true
      // }
    ];
  }

  /**
   * Sync files between primary and backup providers
   * @param {object} options - Sync options
   * @returns {Promise<object>} Sync result
   */
  async syncProviders(options = {}) {
    try {
      logInfo('🔄 Starting provider synchronization...');
      
      if (!this.provider || !this.backupProvider) {
        throw new Error('Both primary and backup providers required for sync');
      }

      const {
        direction = 'primary-to-backup', // 'primary-to-backup', 'backup-to-primary', 'bidirectional'
        dryRun = false
      } = options;

      // Get file lists from both providers
      const primaryFiles = await this.provider.listObjects({ maxKeys: 1000 });
      const backupFiles = await this.backupProvider.listObjects({ maxKeys: 1000 });

      // Create file maps for comparison
      const primaryMap = new Map(primaryFiles.objects.map(obj => [obj.Key, obj]));
      const backupMap = new Map(backupFiles.objects.map(obj => [obj.Key, obj]));

      const syncResults = {
        toBackup: [],
        toPrimary: [],
        conflicts: [],
        errors: []
      };

      // Find files that need to be synced
      if (direction === 'primary-to-backup' || direction === 'bidirectional') {
        for (const [key, obj] of primaryMap) {
          if (!backupMap.has(key)) {
            syncResults.toBackup.push(key);
          }
        }
      }

      if (direction === 'backup-to-primary' || direction === 'bidirectional') {
        for (const [key, obj] of backupMap) {
          if (!primaryMap.has(key)) {
            syncResults.toPrimary.push(key);
          }
        }
      }

      // Handle conflicts (files exist in both but with different ETags)
      if (direction === 'bidirectional') {
        for (const [key, primaryObj] of primaryMap) {
          const backupObj = backupMap.get(key);
          if (backupObj && primaryObj.ETag !== backupObj.ETag) {
            syncResults.conflicts.push({
              key,
              primaryETag: primaryObj.ETag,
              backupETag: backupObj.ETag
            });
          }
        }
      }

      logInfo(`📊 Sync analysis: ${syncResults.toBackup.length} to backup, ${syncResults.toPrimary.length} to primary, ${syncResults.conflicts.length} conflicts`);

      // Perform actual sync if not dry run
      if (!dryRun) {
        // Copy files to backup
        for (const key of syncResults.toBackup) {
          try {
            await this.copyBetweenProviders(key, this.provider, this.backupProvider);
            logInfo(`✅ Copied to backup: ${key}`);
          } catch (error) {
            syncResults.errors.push({ key, error: error.message, direction: 'to-backup' });
            logError(`❌ Failed to copy to backup ${key}:`, error);
          }
        }

        // Copy files to primary
        for (const key of syncResults.toPrimary) {
          try {
            await this.copyBetweenProviders(key, this.backupProvider, this.provider);
            logInfo(`✅ Copied to primary: ${key}`);
          } catch (error) {
            syncResults.errors.push({ key, error: error.message, direction: 'to-primary' });
            logError(`❌ Failed to copy to primary ${key}:`, error);
          }
        }
      }

      return {
        success: true,
        syncResults,
        dryRun
      };

    } catch (error) {
      logError('❌ Provider sync failed:', error);
      throw new Error(`Provider sync failed: ${error.message}`);
    }
  }

  /**
   * Copy a file between providers
   * @param {string} key - Object key
   * @param {object} sourceProvider - Source provider
   * @param {object} targetProvider - Target provider
   * @returns {Promise<void>}
   */
  async copyBetweenProviders(key, sourceProvider, targetProvider) {
    // Get source object data
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const getCommand = new GetObjectCommand({
      Bucket: sourceProvider.config.bucket_name,
      Key: key
    });

    const sourceObject = await sourceProvider.client.send(getCommand);
    
    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of sourceObject.Body) {
      chunks.push(chunk);
    }
    const fileData = Buffer.concat(chunks);

    // Upload to target provider
    await targetProvider.uploadFile(fileData, key, {
      contentType: sourceObject.ContentType,
      metadata: sourceObject.Metadata
    });
  }

  /**
   * Get storage statistics
   * @returns {Promise<object>} Storage statistics
   */
  async getStatistics() {
    try {
      const stats = {
        service: { ...this.stats },
        provider: null,
        backup: null
      };

      // Get provider statistics
      if (this.provider) {
        stats.provider = {
          name: this.provider.name,
          type: this.provider.type,
          info: this.provider.getProviderInfo()
        };

        // Get bucket usage if supported
        if (typeof this.provider.getBucketUsage === 'function') {
          stats.provider.usage = await this.provider.getBucketUsage();
        }
      }

      // Get backup provider statistics
      if (this.backupProvider) {
        stats.backup = {
          name: this.backupProvider.name,
          type: this.backupProvider.type,
          info: this.backupProvider.getProviderInfo()
        };

        if (typeof this.backupProvider.getBucketUsage === 'function') {
          stats.backup.usage = await this.backupProvider.getBucketUsage();
        }
      }

      return stats;

    } catch (error) {
      logError('❌ Get statistics failed:', error);
      throw new Error(`Get statistics failed: ${error.message}`);
    }
  }

  /**
   * Log file operation for analytics
   * @param {string} operation - Operation type
   * @param {object} data - Operation data
   * @returns {Promise<void>}
   */
  async logFileOperation(operation, data) {
    if (!this.config.enable_analytics) {
      return;
    }

    try {
      // This would integrate with your analytics system
      // For now, just log to console
      const logEntry = {
        timestamp: new Date().toISOString(),
        operation,
        ...data
      };

      if (this.config.log_file_operations) {
        logInfo(`📊 Analytics: ${JSON.stringify(logEntry)}`);
      }

      // In a real implementation, you'd save this to a database or analytics service

    } catch (error) {
      logWarning('⚠️ Analytics logging failed:', error);
    }
  }

  /**
   * Update configuration
   * @param {object} newConfig - New configuration
   * @returns {Promise<void>}
   */
  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Update dependent services
    if (this.fileManager) {
      this.fileManager.updateConfig(this.config);
    }
    if (this.urlService) {
      this.urlService.updateConfig(this.config);
    }
    
    logInfo('⚙️ S3 Storage Service configuration updated');
  }

  /**
   * Cleanup resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      // Clean up providers
      if (this.provider && typeof this.provider.cleanup === 'function') {
        await this.provider.cleanup();
      }
      if (this.backupProvider && typeof this.backupProvider.cleanup === 'function') {
        await this.backupProvider.cleanup();
      }

      // Clear processing queue
      this.processingQueue = [];
      
      logInfo('🧹 S3 Storage Service cleanup completed');

    } catch (error) {
      logError('❌ S3 Storage Service cleanup failed:', error);
    }
  }

  /**
   * Get service status
   * @returns {object} Service status
   */
  getStatus() {
    return {
      initialized: !!(this.provider && this.fileManager && this.urlService),
      provider: this.provider ? this.provider.type : null,
      backupProvider: this.backupProvider ? this.backupProvider.type : null,
      stats: this.stats,
      queueSize: this.processingQueue.length,
      isProcessing: this.isProcessing
    };
  }
}

module.exports = S3StorageService;