const S3StorageService = require('./services/s3-storage-service');
const ProviderFactory = require('./services/provider-factory');
const FileManager = require('./services/file-manager');
const UrlService = require('./services/url-service');
const { validateConfig, validateProvider } = require('./utils/validators');
const { logError, logInfo, logWarning } = require('./utils/error-handler');

class S3StorageModule {
  constructor(config = {}) {
    this.config = config;
    this.name = 's3-storage';
    this.version = '1.0.0';
    
    // Statistics
    this.stats = {
      totalUploads: 0,
      totalDownloads: 0,
      totalStorage: 0,
      totalDeletes: 0,
      providerStats: {},
      errors: 0,
      lastSync: null
    };
    
    // Services
    this.storageService = null;
    this.providerFactory = null;
    this.fileManager = null;
    this.urlService = null;
    
    // State
    this.isInitialized = false;
    this.activeProvider = null;
    this.backupProvider = null;
    
    logInfo('🗄️ S3 Storage Module constructor called');
  }

  async initialize() {
    logInfo('🗄️ S3 Storage Module initializing...');
    
    try {
      // Validate configuration
      const configErrors = validateConfig(this.config);
      if (configErrors.length > 0) {
        throw new Error(`S3 Storage configuration errors: ${configErrors.join(', ')}`);
      }
      
      // Initialize services
      this.providerFactory = new ProviderFactory();
      this.fileManager = new FileManager(this.config);
      this.urlService = new UrlService(this.config);
      
      // Initialize storage provider
      await this.initializeStorageProvider();
      
      // Initialize backup provider if enabled
      if (this.config.backup_to_secondary && this.config.secondary_provider) {
        await this.initializeBackupProvider();
      }
      
      // Initialize storage service
      this.storageService = new S3StorageService({
        config: this.config,
        provider: this.activeProvider,
        backupProvider: this.backupProvider,
        fileManager: this.fileManager,
        urlService: this.urlService
      });
      
      // Register hooks with the CMS
      await this.registerHooks();
      
      // Load existing statistics
      await this.loadStatistics();
      
      this.isInitialized = true;
      
      logInfo('✅ S3 Storage Module initialized successfully!');
      logInfo(`📊 Active provider: ${this.config.storage_provider}`);
      logInfo(`📁 Bucket: ${this.config.bucket_name}`);
      logInfo(`🔗 Public URL: ${this.config.public_url || 'Auto-generated'}`);
      
    } catch (error) {
      logError('❌ S3 Storage Module initialization failed:', error);
      this.stats.errors++;
      throw error;
    }
  }

  async cleanup() {
    logInfo('🧹 S3 Storage Module cleanup...');
    
    try {
      // Unregister hooks
      await this.unregisterHooks();
      
      // Save statistics
      await this.saveStatistics();
      
      // Cleanup services
      if (this.storageService) {
        await this.storageService.cleanup();
      }
      
      // Reset state
      this.isInitialized = false;
      this.activeProvider = null;
      this.backupProvider = null;
      
      logInfo('📊 S3 Storage Module Statistics:');
      logInfo(`   Total uploads: ${this.stats.totalUploads}`);
      logInfo(`   Total downloads: ${this.stats.totalDownloads}`);
      logInfo(`   Total storage: ${this.formatBytes(this.stats.totalStorage)}`);
      logInfo(`   Total deletes: ${this.stats.totalDeletes}`);
      logInfo(`   Errors: ${this.stats.errors}`);
      
      logInfo('👋 S3 Storage Module deactivated');
      
    } catch (error) {
      logError('❌ S3 Storage Module cleanup failed:', error);
    }
  }

  async updateConfig(newConfig) {
    logInfo('🔄 S3 Storage Module config updated:', Object.keys(newConfig));
    
    try {
      const oldProvider = this.config.storage_provider;
      this.config = { ...this.config, ...newConfig };
      
      // Reinitialize if provider changed
      if (newConfig.storage_provider && newConfig.storage_provider !== oldProvider) {
        logInfo(`🔄 Provider changed from ${oldProvider} to ${newConfig.storage_provider}`);
        await this.initializeStorageProvider();
      }
      
      // Reinitialize backup provider if changed
      if (newConfig.backup_to_secondary !== undefined || newConfig.secondary_provider) {
        await this.initializeBackupProvider();
      }
      
      // Update services with new config
      if (this.storageService) {
        await this.storageService.updateConfig(this.config);
      }
      if (this.fileManager) {
        this.fileManager.updateConfig(this.config);
      }
      if (this.urlService) {
        this.urlService.updateConfig(this.config);
      }
      
      logInfo('✅ S3 Storage Module config updated successfully');
      
    } catch (error) {
      logError('❌ S3 Storage Module config update failed:', error);
      this.stats.errors++;
      throw error;
    }
  }

  async initializeStorageProvider() {
    const provider = this.config.storage_provider;
    
    if (!provider || provider === 'local') {
      logInfo('📁 Using local storage (no S3 provider configured)');
      this.activeProvider = null;
      return;
    }
    
    logInfo(`🔧 Initializing ${provider} storage provider...`);
    
    try {
      // Validate provider configuration
      const providerErrors = validateProvider(provider, this.config);
      if (providerErrors.length > 0) {
        throw new Error(`Provider ${provider} validation errors: ${providerErrors.join(', ')}`);
      }
      
      // Create provider instance
      this.activeProvider = await this.providerFactory.createProvider(provider, this.config);
      
      // Test connection
      await this.activeProvider.testConnection();
      
      logInfo(`   ✅ ${provider} provider initialized and tested`);
      
    } catch (error) {
      logError(`   ❌ Failed to initialize ${provider}:`, error);
      this.stats.errors++;
      throw error;
    }
  }

  async initializeBackupProvider() {
    if (!this.config.backup_to_secondary || !this.config.secondary_provider) {
      this.backupProvider = null;
      return;
    }
    
    const provider = this.config.secondary_provider;
    logInfo(`🔧 Initializing backup provider: ${provider}`);
    
    try {
      // Create backup provider instance
      this.backupProvider = await this.providerFactory.createProvider(provider, {
        ...this.config,
        // Use backup-specific credentials if provided
        aws_access_key_id: this.config.backup_access_key_id || this.config.aws_access_key_id,
        aws_secret_access_key: this.config.backup_secret_access_key || this.config.aws_secret_access_key,
        bucket_name: this.config.backup_bucket_name || this.config.bucket_name + '-backup'
      });
      
      // Test backup connection
      await this.backupProvider.testConnection();
      
      logInfo(`   ✅ Backup provider ${provider} initialized and tested`);
      
    } catch (error) {
      logWarning(`   ⚠️ Failed to initialize backup provider ${provider}:`, error);
      this.backupProvider = null;
      // Don't throw error for backup provider failure
    }
  }

  async registerHooks() {
    logInfo('🪝 Registering S3 Storage hooks...');
    
    // Hook into media upload process
    if (global.vyralHooks) {
      global.vyralHooks.register('media:before-upload', this.onBeforeUpload.bind(this));
      global.vyralHooks.register('media:after-upload', this.onAfterUpload.bind(this));
      global.vyralHooks.register('media:before-delete', this.onBeforeDelete.bind(this));
      global.vyralHooks.register('media:after-delete', this.onAfterDelete.bind(this));
      global.vyralHooks.register('url:generate', this.onGenerateUrl.bind(this));
    }
  }

  async unregisterHooks() {
    logInfo('🪝 Unregistering S3 Storage hooks...');
    
    if (global.vyralHooks) {
      global.vyralHooks.unregister('media:before-upload', this.onBeforeUpload.bind(this));
      global.vyralHooks.unregister('media:after-upload', this.onAfterUpload.bind(this));
      global.vyralHooks.unregister('media:before-delete', this.onBeforeDelete.bind(this));
      global.vyralHooks.unregister('media:after-delete', this.onAfterDelete.bind(this));
      global.vyralHooks.unregister('url:generate', this.onGenerateUrl.bind(this));
    }
  }

  // Hook Handlers
  async onBeforeUpload(uploadData) {
    if (!this.isInitialized || !this.activeProvider) {
      return uploadData; // Pass through to local storage
    }
    
    logInfo('🎯 S3 Storage: Before upload hook triggered');
    
    try {
      // Process file before upload (optimization, validation, etc.)
      if (this.config.auto_optimize_images && this.fileManager.isImage(uploadData.file)) {
        uploadData.file = await this.fileManager.optimizeImage(uploadData.file, {
          quality: this.config.image_quality,
          maxWidth: this.config.max_image_width,
          maxHeight: this.config.max_image_height
        });
      }
      
      // Generate S3 file path
      uploadData.s3Path = this.fileManager.generateS3Path(uploadData.file);
      
      return uploadData;
      
    } catch (error) {
      logError('❌ S3 Storage before upload hook error:', error);
      this.stats.errors++;
      throw error;
    }
  }

  async onAfterUpload(uploadResult) {
    if (!this.isInitialized || !this.activeProvider) {
      return uploadResult; // Pass through
    }
    
    logInfo('🎯 S3 Storage: After upload hook triggered');
    
    try {
      // Upload to S3
      const s3Result = await this.storageService.uploadFile(uploadResult);
      
      // Update upload result with S3 URLs
      uploadResult.url = s3Result.url;
      uploadResult.s3Key = s3Result.key;
      uploadResult.storageProvider = this.config.storage_provider;
      
      // Update statistics
      this.stats.totalUploads++;
      this.stats.totalStorage += uploadResult.size || 0;
      this.updateProviderStats('uploads', 1);
      
      logInfo(`✅ File uploaded to S3: ${s3Result.url}`);
      
      return uploadResult;
      
    } catch (error) {
      logError('❌ S3 Storage after upload hook error:', error);
      this.stats.errors++;
      throw error;
    }
  }

  async onBeforeDelete(deleteData) {
    logInfo('🎯 S3 Storage: Before delete hook triggered');
    return deleteData;
  }

  async onAfterDelete(deleteResult) {
    if (!this.isInitialized || !this.activeProvider) {
      return deleteResult;
    }
    
    logInfo('🎯 S3 Storage: After delete hook triggered');
    
    try {
      // Delete from S3 if file has S3 key
      if (deleteResult.s3Key) {
        await this.storageService.deleteFile(deleteResult.s3Key);
        
        // Update statistics
        this.stats.totalDeletes++;
        this.updateProviderStats('deletes', 1);
        
        logInfo(`✅ File deleted from S3: ${deleteResult.s3Key}`);
      }
      
      return deleteResult;
      
    } catch (error) {
      logError('❌ S3 Storage after delete hook error:', error);
      this.stats.errors++;
      // Don't throw error - file deletion from DB should succeed
      return deleteResult;
    }
  }

  async onGenerateUrl(urlData) {
    if (!this.isInitialized || !this.activeProvider || !urlData.s3Key) {
      return urlData;
    }
    
    try {
      // Generate URL using URL service
      urlData.url = await this.urlService.generateUrl(urlData.s3Key, {
        isPrivate: urlData.isPrivate,
        expiresIn: urlData.expiresIn
      });
      
      this.stats.totalDownloads++;
      this.updateProviderStats('downloads', 1);
      
      return urlData;
      
    } catch (error) {
      logError('❌ S3 Storage URL generation error:', error);
      this.stats.errors++;
      return urlData; // Return original data on error
    }
  }

  // API Route Handlers
  async getProviders(req, res) {
    try {
      logInfo('📞 GET /api/s3-storage/providers');
      
      const providers = this.providerFactory.getAvailableProviders();
      
      res.json({
        success: true,
        data: {
          providers,
          activeProvider: this.config.storage_provider,
          backupProvider: this.config.secondary_provider
        }
      });
      
    } catch (error) {
      logError('❌ Get providers error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async testConnection(req, res) {
    try {
      logInfo('📞 POST /api/s3-storage/test-connection');
      
      const { provider, config: testConfig } = req.body;
      
      // Create temporary provider instance for testing
      const testProvider = await this.providerFactory.createProvider(provider, testConfig);
      const result = await testProvider.testConnection();
      
      res.json({
        success: true,
        data: result,
        message: 'Connection test successful'
      });
      
    } catch (error) {
      logError('❌ Test connection error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async getStorageStats(req, res) {
    try {
      logInfo('📞 GET /api/s3-storage/stats');
      
      const stats = await this.getStats();
      
      res.json({
        success: true,
        data: stats
      });
      
    } catch (error) {
      logError('❌ Get storage stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async healthCheck(req, res) {
    try {
      const isHealthy = this.isInitialized && (!this.activeProvider || await this.activeProvider.testConnection());
      
      res.json({
        success: true,
        data: {
          status: isHealthy ? 'healthy' : 'unhealthy',
          provider: this.config.storage_provider,
          initialized: this.isInitialized,
          stats: this.stats
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Utility Methods
  updateProviderStats(type, value) {
    const provider = this.config.storage_provider;
    if (!this.stats.providerStats[provider]) {
      this.stats.providerStats[provider] = {
        uploads: 0,
        downloads: 0,
        deletes: 0
      };
    }
    this.stats.providerStats[provider][type] += value;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async loadStatistics() {
    // Load statistics from database or file
    // Implementation depends on your data storage preference
    logInfo('📊 Loading S3 Storage statistics...');
  }

  async saveStatistics() {
    // Save statistics to database or file
    // Implementation depends on your data storage preference
    logInfo('💾 Saving S3 Storage statistics...');
  }

  getStats() {
    return {
      ...this.stats,
      activeProvider: this.config.storage_provider,
      backupProvider: this.config.secondary_provider,
      bucketName: this.config.bucket_name,
      publicUrl: this.config.public_url,
      config: {
        autoOptimizeImages: this.config.auto_optimize_images,
        imageQuality: this.config.image_quality,
        folderStructure: this.config.folder_structure,
        enableAnalytics: this.config.enable_analytics,
        backupEnabled: this.config.backup_to_secondary
      }
    };
  }
}

module.exports = S3StorageModule;