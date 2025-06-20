const fs = require('fs');
const path = require('path');

async function installS3StorageModule() {
  console.log('🗄️ Installing S3 Storage Module...');
  
  try {
    // Create necessary directories
    const modulePath = __dirname;
    const directories = [
      'services',
      'providers', 
      'utils',
      'config',
      'api',
      'hooks',
      'admin',
      'middleware',
      'tests/unit',
      'tests/integration',
      'docs/provider-setup'
    ];
    
    for (const dir of directories) {
      const dirPath = path.join(modulePath, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`   📁 Created directory: ${dir}`);
      }
    }
    
    // Create default configuration files
    await createDefaultConfigs(modulePath);
    
    // Create API route files if they don't exist
    await createApiRoutes(modulePath);
    
    // Create hook files if they don't exist
    await createHookFiles(modulePath);
    
    // Create utility files if they don't exist
    await createUtilityFiles(modulePath);
    
    // Create provider files if they don't exist
    await createProviderFiles(modulePath);
    
    // Create service files if they don't exist
    await createServiceFiles(modulePath);
    
    // Create admin interface files if they don't exist
    await createAdminFiles(modulePath);
    
    // Create middleware files if they don't exist
    await createMiddlewareFiles(modulePath);
    
    // Create test files if they don't exist
    await createTestFiles(modulePath);
    
    // Create documentation files if they don't exist
    await createDocumentationFiles(modulePath);
    
    console.log('✅ S3 Storage Module installation completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Configure your S3 provider in the admin settings');
    console.log('   2. Test the connection using the built-in test tool');
    console.log('   3. Optionally migrate existing files from local storage');
    console.log('   4. Activate the module in the admin panel');
    console.log('');
    console.log('📖 Documentation: /modules/s3-storage/docs/setup-guide.md');
    
  } catch (error) {
    console.error('❌ S3 Storage Module installation failed:', error);
    process.exit(1);
  }
}

async function createDefaultConfigs(modulePath) {
  console.log('⚙️ Creating default configuration files...');
  
  // Create providers.json
  const providersConfig = {
    "aws-s3": {
      "name": "Amazon S3",
      "endpoint": "s3.amazonaws.com",
      "supportsAcceleration": true,
      "supportsVersioning": true,
      "regions": ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"]
    },
    "vultr-storage": {
      "name": "Vultr Object Storage",
      "endpoint": "ewr1.vultrobjects.com",
      "supportsAcceleration": false,
      "supportsVersioning": false,
      "regions": ["ewr1", "sjc1", "ams1"]
    },
    "cloudflare-r2": {
      "name": "Cloudflare R2",
      "endpoint": "cloudflare-r2",
      "supportsAcceleration": false,
      "supportsVersioning": false,
      "regions": ["auto"]
    },
    "digitalocean-spaces": {
      "name": "DigitalOcean Spaces",
      "endpoint": "digitaloceanspaces.com",
      "supportsAcceleration": false,
      "supportsVersioning": false,
      "regions": ["nyc3", "sgp1", "fra1", "ams3"]
    },
    "linode-storage": {
      "name": "Linode Object Storage",
      "endpoint": "linodeobjects.com",
      "supportsAcceleration": false,
      "supportsVersioning": false,
      "regions": ["us-east-1", "eu-central-1", "ap-south-1"]
    }
  };
  
  const providersPath = path.join(modulePath, 'config', 'providers.json');
  if (!fs.existsSync(providersPath)) {
    fs.writeFileSync(providersPath, JSON.stringify(providersConfig, null, 2));
    console.log('   📄 Created providers.json');
  }
  
  // Create defaults.json
  const defaultsConfig = {
    "maxFileSize": 104857600,
    "allowedExtensions": ["jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx", "zip"],
    "imageFormats": ["jpg", "jpeg", "png", "gif", "webp"],
    "compressionQuality": 85,
    "maxImageDimensions": {
      "width": 2048,
      "height": 2048
    },
    "folderPatterns": {
      "date-based": "{year}/{month}/",
      "type-based": "{type}/",
      "user-based": "users/{userId}/",
      "custom": "{year}/{month}/{type}/"
    }
  };
  
  const defaultsPath = path.join(modulePath, 'config', 'defaults.json');
  if (!fs.existsSync(defaultsPath)) {
    fs.writeFileSync(defaultsPath, JSON.stringify(defaultsConfig, null, 2));
    console.log('   📄 Created defaults.json');
  }
}

async function createApiRoutes(modulePath) {
  console.log('🌐 Creating API route files...');
  
  const apiFiles = [
    { name: 'upload.js', content: createUploadApiContent() },
    { name: 'delete.js', content: createDeleteApiContent() },
    { name: 'migrate.js', content: createMigrateApiContent() },
    { name: 'test-connection.js', content: createTestConnectionApiContent() },
    { name: 'settings.js', content: createSettingsApiContent() }
  ];
  
  for (const file of apiFiles) {
    const filePath = path.join(modulePath, 'api', file.name);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, file.content);
      console.log(`   📄 Created api/${file.name}`);
    }
  }
}

async function createHookFiles(modulePath) {
  console.log('🪝 Creating hook files...');
  
  const hookFiles = [
    { name: 'media-upload.js', content: createMediaUploadHookContent() },
    { name: 'media-delete.js', content: createMediaDeleteHookContent() },
    { name: 'url-generation.js', content: createUrlGenerationHookContent() }
  ];
  
  for (const file of hookFiles) {
    const filePath = path.join(modulePath, 'hooks', file.name);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, file.content);
      console.log(`   📄 Created hooks/${file.name}`);
    }
  }
}

async function createUtilityFiles(modulePath) {
  console.log('🔧 Creating utility files...');
  
  const utilFiles = [
    { name: 'validators.js', content: createValidatorsContent() },
    { name: 'file-utils.js', content: createFileUtilsContent() },
    { name: 'mime-helper.js', content: createMimeHelperContent() },
    { name: 'error-handler.js', content: createErrorHandlerContent() }
  ];
  
  for (const file of utilFiles) {
    const filePath = path.join(modulePath, 'utils', file.name);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, file.content);
      console.log(`   📄 Created utils/${file.name}`);
    }
  }
}

async function createProviderFiles(modulePath) {
  console.log('☁️ Creating provider files...');
  
  const providerFiles = [
    { name: 'base-provider.js', content: createBaseProviderContent() },
    { name: 'aws-s3.js', content: createAwsS3ProviderContent() },
    { name: 'vultr-storage.js', content: createVultrProviderContent() },
    { name: 'cloudflare-r2.js', content: createCloudflareR2ProviderContent() },
    { name: 'digitalocean-spaces.js', content: createDigitalOceanProviderContent() },
    { name: 'linode-storage.js', content: createLinodeProviderContent() }
  ];
  
  for (const file of providerFiles) {
    const filePath = path.join(modulePath, 'providers', file.name);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, file.content);
      console.log(`   📄 Created providers/${file.name}`);
    }
  }
}

async function createServiceFiles(modulePath) {
  console.log('⚙️ Creating service files...');
  
  const serviceFiles = [
    { name: 's3-storage-service.js', content: createS3StorageServiceContent() },
    { name: 'provider-factory.js', content: createProviderFactoryContent() },
    { name: 'file-manager.js', content: createFileManagerContent() },
    { name: 'url-service.js', content: createUrlServiceContent() }
  ];
  
  for (const file of serviceFiles) {
    const filePath = path.join(modulePath, 'services', file.name);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, file.content);
      console.log(`   📄 Created services/${file.name}`);
    }
  }
}

async function createAdminFiles(modulePath) {
  console.log('👨‍💼 Creating admin interface files...');
  
  const adminFiles = [
    { name: 'settings-panel.js', content: createSettingsPanelContent() },
    { name: 'storage-stats.js', content: createStorageStatsContent() },
    { name: 'migration-tool.js', content: createMigrationToolContent() },
    { name: 'test-connection.js', content: createTestConnectionContent() }
  ];
  
  for (const file of adminFiles) {
    const filePath = path.join(modulePath, 'admin', file.name);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, file.content);
      console.log(`   📄 Created admin/${file.name}`);
    }
  }
}

async function createMiddlewareFiles(modulePath) {
  console.log('🔗 Creating middleware files...');
  
  const middlewareFiles = [
    { name: 'storage-interceptor.js', content: createStorageInterceptorContent() },
    { name: 'upload-handler.js', content: createUploadHandlerContent() }
  ];
  
  for (const file of middlewareFiles) {
    const filePath = path.join(modulePath, 'middleware', file.name);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, file.content);
      console.log(`   📄 Created middleware/${file.name}`);
    }
  }
}

async function createTestFiles(modulePath) {
  console.log('🧪 Creating test files...');
  
  const testFiles = [
    { name: 'unit/providers.test.js', content: createProviderTestContent() },
    { name: 'unit/services.test.js', content: createServiceTestContent() },
    { name: 'unit/utils.test.js', content: createUtilTestContent() },
    { name: 'integration/s3-upload.test.js', content: createUploadTestContent() },
    { name: 'integration/migration.test.js', content: createMigrationTestContent() }
  ];
  
  for (const file of testFiles) {
    const filePath = path.join(modulePath, 'tests', file.name);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, file.content);
      console.log(`   📄 Created tests/${file.name}`);
    }
  }
}

async function createDocumentationFiles(modulePath) {
  console.log('📖 Creating documentation files...');
  
  const docFiles = [
    { name: 'setup-guide.md', content: createSetupGuideContent() },
    { name: 'provider-setup/aws-s3.md', content: createAwsSetupContent() },
    { name: 'provider-setup/vultr.md', content: createVultrSetupContent() },
    { name: 'provider-setup/cloudflare-r2.md', content: createCloudflareSetupContent() },
    { name: 'provider-setup/digitalocean.md', content: createDigitalOceanSetupContent() },
    { name: 'provider-setup/linode.md', content: createLinodeSetupContent() },
    { name: 'migration-guide.md', content: createMigrationGuideContent() },
    { name: 'troubleshooting.md', content: createTroubleshootingContent() },
    { name: 'api-reference.md', content: createApiReferenceContent() }
  ];
  
  for (const file of docFiles) {
    const filePath = path.join(modulePath, 'docs', file.name);
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, file.content);
      console.log(`   📄 Created docs/${file.name}`);
    }
  }
}

// Placeholder content generators (these would contain the actual file content)
function createUploadApiContent() {
  return `// S3 Storage Module - Upload API Handler
// This file handles file uploads to S3 storage
module.exports = {
  // Upload handler implementation will be added here
};`;
}

function createDeleteApiContent() {
  return `// S3 Storage Module - Delete API Handler
// This file handles file deletions from S3 storage
module.exports = {
  // Delete handler implementation will be added here
};`;
}

function createMigrateApiContent() {
  return `// S3 Storage Module - Migration API Handler
// This file handles migration from local to S3 storage
module.exports = {
  // Migration handler implementation will be added here
};`;
}

function createTestConnectionApiContent() {
  return `// S3 Storage Module - Test Connection API Handler
// This file handles S3 connection testing
module.exports = {
  // Test connection implementation will be added here
};`;
}

function createSettingsApiContent() {
  return `// S3 Storage Module - Settings API Handler
// This file handles module settings management
module.exports = {
  // Settings handler implementation will be added here
};`;
}

function createMediaUploadHookContent() {
  return `// S3 Storage Module - Media Upload Hook
// This file handles media upload hooks
module.exports = {
  // Upload hook implementation will be added here
};`;
}

function createMediaDeleteHookContent() {
  return `// S3 Storage Module - Media Delete Hook
// This file handles media deletion hooks
module.exports = {
  // Delete hook implementation will be added here
};`;
}

function createUrlGenerationHookContent() {
  return `// S3 Storage Module - URL Generation Hook
// This file handles URL generation hooks
module.exports = {
  // URL generation implementation will be added here
};`;
}

function createValidatorsContent() {
  return `// S3 Storage Module - Validators
// This file contains configuration and input validators
module.exports = {
  validateConfig: (config) => [],
  validateProvider: (provider, config) => []
};`;
}

function createFileUtilsContent() {
  return `// S3 Storage Module - File Utilities
// This file contains file processing utilities
module.exports = {
  // File utility functions will be added here
};`;
}

function createMimeHelperContent() {
  return `// S3 Storage Module - MIME Helper
// This file contains MIME type helper functions
module.exports = {
  // MIME helper functions will be added here
};`;
}

function createErrorHandlerContent() {
  return `// S3 Storage Module - Error Handler
// This file contains error handling utilities
function logError(message, error) {
  console.error(message, error);
}

function logInfo(message) {
  console.log(message);
}

function logWarning(message, error) {
  console.warn(message, error);
}

module.exports = {
  logError,
  logInfo,
  logWarning
};`;
}

function createBaseProviderContent() {
  return `// S3 Storage Module - Base Provider
// This file contains the base S3 provider class
class BaseS3Provider {
  constructor(config) {
    this.config = config;
  }
  
  async testConnection() {
    throw new Error('testConnection method must be implemented');
  }
  
  async uploadFile(file, key) {
    throw new Error('uploadFile method must be implemented');
  }
  
  async deleteFile(key) {
    throw new Error('deleteFile method must be implemented');
  }
  
  async generateSignedUrl(key, options) {
    throw new Error('generateSignedUrl method must be implemented');
  }
}

module.exports = BaseS3Provider;`;
}

function createAwsS3ProviderContent() {
  return `// S3 Storage Module - AWS S3 Provider
// This file contains the AWS S3 provider implementation
const BaseS3Provider = require('./base-provider');

class AwsS3Provider extends BaseS3Provider {
  // AWS S3 implementation will be added here
}

module.exports = AwsS3Provider;`;
}

function createVultrProviderContent() {
  return `// S3 Storage Module - Vultr Object Storage Provider
// This file contains the Vultr provider implementation
const BaseS3Provider = require('./base-provider');

class VultrStorageProvider extends BaseS3Provider {
  // Vultr implementation will be added here
}

module.exports = VultrStorageProvider;`;
}

function createCloudflareR2ProviderContent() {
  return `// S3 Storage Module - Cloudflare R2 Provider
// This file contains the Cloudflare R2 provider implementation
const BaseS3Provider = require('./base-provider');

class CloudflareR2Provider extends BaseS3Provider {
  // Cloudflare R2 implementation will be added here
}

module.exports = CloudflareR2Provider;`;
}

function createDigitalOceanProviderContent() {
  return `// S3 Storage Module - DigitalOcean Spaces Provider
// This file contains the DigitalOcean Spaces provider implementation
const BaseS3Provider = require('./base-provider');

class DigitalOceanSpacesProvider extends BaseS3Provider {
  // DigitalOcean Spaces implementation will be added here
}

module.exports = DigitalOceanSpacesProvider;`;
}

function createLinodeProviderContent() {
  return `// S3 Storage Module - Linode Object Storage Provider
// This file contains the Linode provider implementation
const BaseS3Provider = require('./base-provider');

class LinodeStorageProvider extends BaseS3Provider {
  // Linode implementation will be added here
}

module.exports = LinodeStorageProvider;`;
}

function createS3StorageServiceContent() {
  return `// S3 Storage Module - Main Storage Service
// This file contains the main S3 storage service
class S3StorageService {
  // Main storage service implementation will be added here
}

module.exports = S3StorageService;`;
}

function createProviderFactoryContent() {
  return `// S3 Storage Module - Provider Factory
// This file contains the provider factory
class ProviderFactory {
  // Provider factory implementation will be added here
}

module.exports = ProviderFactory;`;
}

function createFileManagerContent() {
  return `// S3 Storage Module - File Manager
// This file contains the file management service
class FileManager {
  // File manager implementation will be added here
}

module.exports = FileManager;`;
}

function createUrlServiceContent() {
  return `// S3 Storage Module - URL Service
// This file contains the URL generation service
class UrlService {
  // URL service implementation will be added here
}

module.exports = UrlService;`;
}

function createSettingsPanelContent() {
  return `// S3 Storage Module - Settings Panel
// This file contains the admin settings panel
module.exports = {
  // Settings panel implementation will be added here
};`;
}

function createStorageStatsContent() {
  return `// S3 Storage Module - Storage Statistics
// This file contains the storage statistics display
module.exports = {
  // Storage stats implementation will be added here
};`;
}

function createMigrationToolContent() {
  return `// S3 Storage Module - Migration Tool
// This file contains the migration tool implementation
module.exports = {
  // Migration tool implementation will be added here
};`;
}

function createTestConnectionContent() {
  return `// S3 Storage Module - Test Connection Tool
// This file contains the connection testing tool
module.exports = {
  // Test connection implementation will be added here
};`;
}

function createStorageInterceptorContent() {
  return `// S3 Storage Module - Storage Interceptor Middleware
// This file contains the storage interceptor middleware
module.exports = {
  // Storage interceptor implementation will be added here
};`;
}

function createUploadHandlerContent() {
  return `// S3 Storage Module - Upload Handler Middleware
// This file contains the upload handler middleware
module.exports = {
  // Upload handler implementation will be added here
};`;
}

function createProviderTestContent() {
  return `// S3 Storage Module - Provider Tests
// This file contains unit tests for providers
describe('S3 Providers', () => {
  // Provider tests will be added here
});`;
}

function createServiceTestContent() {
  return `// S3 Storage Module - Service Tests
// This file contains unit tests for services
describe('S3 Services', () => {
  // Service tests will be added here
});`;
}

function createUtilTestContent() {
  return `// S3 Storage Module - Utility Tests
// This file contains unit tests for utilities
describe('S3 Utilities', () => {
  // Utility tests will be added here
});`;
}

function createUploadTestContent() {
  return `// S3 Storage Module - Upload Integration Tests
// This file contains integration tests for file uploads
describe('S3 Upload Integration', () => {
  // Upload integration tests will be added here
});`;
}

function createMigrationTestContent() {
  return `// S3 Storage Module - Migration Integration Tests
// This file contains integration tests for file migration
describe('S3 Migration Integration', () => {
  // Migration integration tests will be added here
});`;
}

function createSetupGuideContent() {
  return `# S3 Storage Module - Setup Guide

This guide will help you set up the S3 Storage Module for Vyral CMS.

## Quick Start

1. Install the module
2. Configure your S3 provider
3. Test the connection
4. Migrate existing files (optional)

## Detailed Setup Instructions

[Documentation content will be added here]
`;
}

function createAwsSetupContent() {
  return `# AWS S3 Setup Guide

Instructions for setting up Amazon S3 with the S3 Storage Module.

[AWS-specific setup instructions will be added here]
`;
}

function createVultrSetupContent() {
  return `# Vultr Object Storage Setup Guide

Instructions for setting up Vultr Object Storage with the S3 Storage Module.

[Vultr-specific setup instructions will be added here]
`;
}

function createCloudflareSetupContent() {
  return `# Cloudflare R2 Setup Guide

Instructions for setting up Cloudflare R2 with the S3 Storage Module.

[Cloudflare R2-specific setup instructions will be added here]
`;
}

function createDigitalOceanSetupContent() {
  return `# DigitalOcean Spaces Setup Guide

Instructions for setting up DigitalOcean Spaces with the S3 Storage Module.

[DigitalOcean-specific setup instructions will be added here]
`;
}

function createLinodeSetupContent() {
  return `# Linode Object Storage Setup Guide

Instructions for setting up Linode Object Storage with the S3 Storage Module.

[Linode-specific setup instructions will be added here]
`;
}

function createMigrationGuideContent() {
  return `# Migration Guide

Instructions for migrating files from local storage to S3.

[Migration instructions will be added here]
`;
}

function createTroubleshootingContent() {
  return `# Troubleshooting Guide

Common issues and solutions for the S3 Storage Module.

[Troubleshooting content will be added here]
`;
}

function createApiReferenceContent() {
  return `# API Reference

API documentation for the S3 Storage Module.

[API documentation will be added here]
`;
}

// Run the installation
if (require.main === module) {
  installS3StorageModule().catch(console.error);
}

module.exports = { installS3StorageModule };