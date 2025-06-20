/**
 * Configuration and input validators for S3 Storage Module
 */

/**
 * Validate module configuration
 * @param {object} config - Configuration object
 * @returns {string[]} Array of validation errors
 */
function validateConfig(config) {
  const errors = [];
  
  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object');
    return errors;
  }

  // Validate storage provider
  if (!config.storage_provider) {
    errors.push('Storage provider is required');
  } else if (config.storage_provider !== 'local' && !isValidProvider(config.storage_provider)) {
    errors.push(`Invalid storage provider: ${config.storage_provider}`);
  }

  // Validate folder structure
  if (config.folder_structure && !isValidFolderStructure(config.folder_structure)) {
    errors.push(`Invalid folder structure: ${config.folder_structure}`);
  }

  // Validate image optimization settings
  if (config.auto_optimize_images) {
    if (config.image_quality !== undefined) {
      if (!Number.isInteger(config.image_quality) || config.image_quality < 1 || config.image_quality > 100) {
        errors.push('Image quality must be an integer between 1 and 100');
      }
    }

    if (config.max_image_width !== undefined) {
      if (!Number.isInteger(config.max_image_width) || config.max_image_width < 0) {
        errors.push('Max image width must be a non-negative integer');
      }
    }

    if (config.max_image_height !== undefined) {
      if (!Number.isInteger(config.max_image_height) || config.max_image_height < 0) {
        errors.push('Max image height must be a non-negative integer');
      }
    }
  }

  // Validate signed URL expiry
  if (config.signed_url_expiry !== undefined) {
    if (!Number.isInteger(config.signed_url_expiry) || config.signed_url_expiry < 1) {
      errors.push('Signed URL expiry must be a positive integer (minutes)');
    }
  }

  return errors;
}

/**
 * Validate provider-specific configuration
 * @param {string} provider - Provider type
 * @param {object} config - Configuration object
 * @returns {string[]} Array of validation errors
 */
function validateProvider(provider, config) {
  const errors = [];

  if (!provider || provider === 'local') {
    return errors; // No validation needed for local storage
  }

  // Common validations for all S3 providers
  const commonRequired = ['aws_access_key_id', 'aws_secret_access_key', 'bucket_name'];
  
  for (const field of commonRequired) {
    if (!config[field] || config[field].trim() === '') {
      errors.push(`${field} is required for ${provider}`);
    }
  }

  // Provider-specific validations
  switch (provider) {
    case 'aws-s3':
      errors.push(...validateAwsS3Config(config));
      break;
    
    case 'vultr-storage':
      errors.push(...validateVultrConfig(config));
      break;
    
    case 'cloudflare-r2':
      errors.push(...validateCloudflareR2Config(config));
      break;
    
    case 'digitalocean-spaces':
      errors.push(...validateDigitalOceanConfig(config));
      break;
    
    case 'linode-storage':
      errors.push(...validateLinodeConfig(config));
      break;
    
    case 'custom-s3':
      errors.push(...validateCustomS3Config(config));
      break;
    
    default:
      errors.push(`Unknown provider: ${provider}`);
  }

  return errors;
}

/**
 * Validate AWS S3 configuration
 * @param {object} config - Configuration object
 * @returns {string[]} Array of validation errors
 */
function validateAwsS3Config(config) {
  const errors = [];

  // Region is required for AWS S3
  if (!config.aws_region) {
    errors.push('AWS region is required for AWS S3');
  } else if (!isValidAwsRegion(config.aws_region)) {
    errors.push(`Invalid AWS region: ${config.aws_region}`);
  }

  // Validate bucket name format for AWS
  if (config.bucket_name && !isValidAwsBucketName(config.bucket_name)) {
    errors.push('Invalid AWS S3 bucket name format');
  }

  // Validate access key format
  if (config.aws_access_key_id && !isValidAwsAccessKey(config.aws_access_key_id)) {
    errors.push('Invalid AWS access key ID format');
  }

  return errors;
}

/**
 * Validate Vultr Object Storage configuration
 * @param {object} config - Configuration object
 * @returns {string[]} Array of validation errors
 */
function validateVultrConfig(config) {
  const errors = [];

  // Region is required for Vultr
  if (!config.aws_region) {
    errors.push('Region is required for Vultr Object Storage');
  } else if (!isValidVultrRegion(config.aws_region)) {
    errors.push(`Invalid Vultr region: ${config.aws_region}`);
  }

  return errors;
}

/**
 * Validate Cloudflare R2 configuration
 * @param {object} config - Configuration object
 * @returns {string[]} Array of validation errors
 */
function validateCloudflareR2Config(config) {
  const errors = [];

  // Account ID is required for R2
  const accountId = config.cloudflare_account_id || config.account_id;
  if (!accountId) {
    errors.push('Cloudflare Account ID is required for R2');
  } else if (!isValidCloudflareAccountId(accountId)) {
    errors.push('Invalid Cloudflare Account ID format');
  }

  // Validate R2 dev subdomain if provided
  if (config.r2_dev_subdomain && !isValidSubdomain(config.r2_dev_subdomain)) {
    errors.push('Invalid R2.dev subdomain format');
  }

  return errors;
}

/**
 * Validate DigitalOcean Spaces configuration
 * @param {object} config - Configuration object
 * @returns {string[]} Array of validation errors
 */
function validateDigitalOceanConfig(config) {
  const errors = [];

  // Region is required for DigitalOcean Spaces
  if (!config.aws_region) {
    errors.push('Region is required for DigitalOcean Spaces');
  } else if (!isValidDigitalOceanRegion(config.aws_region)) {
    errors.push(`Invalid DigitalOcean region: ${config.aws_region}`);
  }

  return errors;
}

/**
 * Validate Linode Object Storage configuration
 * @param {object} config - Configuration object
 * @returns {string[]} Array of validation errors
 */
function validateLinodeConfig(config) {
  const errors = [];

  // Region is required for Linode
  if (!config.aws_region) {
    errors.push('Region is required for Linode Object Storage');
  } else if (!isValidLinodeRegion(config.aws_region)) {
    errors.push(`Invalid Linode region: ${config.aws_region}`);
  }

  return errors;
}

/**
 * Validate custom S3 configuration
 * @param {object} config - Configuration object
 * @returns {string[]} Array of validation errors
 */
function validateCustomS3Config(config) {
  const errors = [];

  // Custom endpoint is required
  if (!config.custom_endpoint) {
    errors.push('Custom endpoint is required for custom S3 provider');
  } else if (!isValidUrl(config.custom_endpoint)) {
    errors.push('Invalid custom endpoint URL format');
  }

  return errors;
}

/**
 * Validate file upload request
 * @param {object} file - File object
 * @param {object} options - Upload options
 * @returns {object} Validation result
 */
function validateFileUpload(file, options = {}) {
  const errors = [];
  const warnings = [];

  // Check if file exists
  if (!file) {
    errors.push('File is required');
    return { valid: false, errors, warnings };
  }

  // Validate file size
  const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default
  const fileSize = file.size || (file.buffer && file.buffer.length) || 0;
  
  if (fileSize === 0) {
    errors.push('File is empty');
  } else if (fileSize > maxSize) {
    errors.push(`File size ${formatBytes(fileSize)} exceeds maximum ${formatBytes(maxSize)}`);
  }

  // Validate filename
  const filename = file.originalName || file.name;
  if (!filename) {
    errors.push('Filename is required');
  } else {
    const filenameErrors = validateFilename(filename);
    errors.push(...filenameErrors);
  }

  // Validate MIME type
  if (file.mimeType && !isValidMimeType(file.mimeType)) {
    warnings.push(`Unusual MIME type: ${file.mimeType}`);
  }

  // Check for allowed extensions
  if (options.allowedExtensions) {
    const extension = getFileExtension(filename || '');
    if (!options.allowedExtensions.includes(extension)) {
      errors.push(`File extension '${extension}' is not allowed`);
    }
  }

  // Check for dangerous file types
  if (filename) {
    const dangerousExtensions = getDangerousExtensions();
    const extension = getFileExtension(filename);
    if (dangerousExtensions.includes(extension)) {
      errors.push(`File type '${extension}' is not allowed for security reasons`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate S3 object key
 * @param {string} key - Object key
 * @returns {object} Validation result
 */
function validateS3Key(key) {
  const errors = [];

  if (!key || typeof key !== 'string') {
    errors.push('S3 key must be a non-empty string');
    return { valid: false, errors };
  }

  // Check key length
  if (key.length > 1024) {
    errors.push('S3 key cannot exceed 1024 characters');
  }

  // Check for invalid characters
  const invalidChars = ['\r', '\n', '\x00'];
  for (const char of invalidChars) {
    if (key.includes(char)) {
      errors.push('S3 key contains invalid characters');
      break;
    }
  }

  // Check for leading/trailing spaces
  if (key !== key.trim()) {
    errors.push('S3 key cannot have leading or trailing spaces');
  }

  // Warn about potentially problematic characters
  const warnings = [];
  if (key.includes('..')) {
    warnings.push('S3 key contains ".." which may cause issues');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate bucket name format
 * @param {string} bucketName - Bucket name
 * @param {string} provider - Provider type
 * @returns {object} Validation result
 */
function validateBucketName(bucketName, provider = 'aws-s3') {
  const errors = [];

  if (!bucketName || typeof bucketName !== 'string') {
    errors.push('Bucket name must be a non-empty string');
    return { valid: false, errors };
  }

  switch (provider) {
    case 'aws-s3':
      if (!isValidAwsBucketName(bucketName)) {
        errors.push('Invalid AWS S3 bucket name format');
      }
      break;
    
    case 'cloudflare-r2':
      if (!isValidR2BucketName(bucketName)) {
        errors.push('Invalid Cloudflare R2 bucket name format');
      }
      break;
    
    default:
      // Generic validation for other S3-compatible services
      if (!isValidGenericBucketName(bucketName)) {
        errors.push('Invalid bucket name format');
      }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Helper validation functions

function isValidProvider(provider) {
  const validProviders = [
    'aws-s3',
    'vultr-storage',
    'cloudflare-r2',
    'digitalocean-spaces',
    'linode-storage',
    'custom-s3'
  ];
  return validProviders.includes(provider);
}

function isValidFolderStructure(structure) {
  const validStructures = ['flat', 'date-based', 'type-based', 'user-based', 'custom'];
  return validStructures.includes(structure);
}

function isValidAwsRegion(region) {
  const awsRegions = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-north-1',
    'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-south-1',
    'ca-central-1', 'sa-east-1', 'af-south-1', 'me-south-1'
  ];
  return awsRegions.includes(region);
}

function isValidVultrRegion(region) {
  const vultrRegions = ['ewr1', 'sjc1', 'ams1'];
  return vultrRegions.includes(region);
}

function isValidDigitalOceanRegion(region) {
  const doRegions = ['nyc1', 'nyc2', 'nyc3', 'ams2', 'ams3', 'sgp1', 'lon1', 'fra1', 'tor1', 'sfo2', 'sfo3', 'blr1'];
  return doRegions.includes(region);
}

function isValidLinodeRegion(region) {
  const linodeRegions = ['us-east-1', 'eu-central-1', 'ap-south-1', 'us-southeast-1'];
  return linodeRegions.includes(region);
}

function isValidAwsBucketName(bucketName) {
  // AWS S3 bucket naming rules
  if (bucketName.length < 3 || bucketName.length > 63) return false;
  if (!/^[a-z0-9.-]+$/.test(bucketName)) return false;
  if (bucketName.startsWith('.') || bucketName.endsWith('.')) return false;
  if (bucketName.startsWith('-') || bucketName.endsWith('-')) return false;
  if (/\.\./.test(bucketName)) return false;
  if (/\.-|-\./.test(bucketName)) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(bucketName)) return false; // No IP addresses
  return true;
}

function isValidR2BucketName(bucketName) {
  // Cloudflare R2 bucket naming (similar to S3 but more permissive)
  if (bucketName.length < 3 || bucketName.length > 63) return false;
  if (!/^[a-z0-9.-]+$/.test(bucketName)) return false;
  return true;
}

function isValidGenericBucketName(bucketName) {
  // Generic S3-compatible bucket naming
  if (bucketName.length < 3 || bucketName.length > 63) return false;
  if (!/^[a-z0-9.-_]+$/.test(bucketName)) return false;
  return true;
}

function isValidAwsAccessKey(accessKey) {
  // AWS access keys are typically 20 characters, alphanumeric
  return /^[A-Z0-9]{20}$/.test(accessKey);
}

function isValidCloudflareAccountId(accountId) {
  // Cloudflare account IDs are 32-character hex strings
  return /^[a-f0-9]{32}$/.test(accountId);
}

function isValidSubdomain(subdomain) {
  // Valid subdomain format
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(subdomain) && subdomain.length <= 63;
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidMimeType(mimeType) {
  // Basic MIME type validation
  return /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/.test(mimeType);
}

function validateFilename(filename) {
  const errors = [];

  if (filename.length > 255) {
    errors.push('Filename cannot exceed 255 characters');
  }

  // Check for dangerous characters
  const dangerousChars = ['<', '>', ':', '"', '|', '?', '*', '\0'];
  for (const char of dangerousChars) {
    if (filename.includes(char)) {
      errors.push(`Filename contains invalid character: ${char}`);
      break;
    }
  }

  // Check for reserved names (Windows)
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  const baseName = filename.split('.')[0].toUpperCase();
  if (reservedNames.includes(baseName)) {
    errors.push(`Filename uses reserved name: ${baseName}`);
  }

  return errors;
}

function getDangerousExtensions() {
  return [
    'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar',
    'app', 'deb', 'pkg', 'rpm', 'dmg', 'sh', 'run', 'msi', 'ps1',
    'php', 'jsp', 'asp', 'aspx', 'py', 'rb', 'pl', 'cgi'
  ];
}

function getFileExtension(filename) {
  const lastDot = filename.lastIndexOf('.');
  return lastDot >= 0 ? filename.slice(lastDot + 1).toLowerCase() : '';
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  validateConfig,
  validateProvider,
  validateFileUpload,
  validateS3Key,
  validateBucketName,
  validateFilename,
  isValidProvider,
  isValidAwsRegion,
  isValidVultrRegion,
  isValidDigitalOceanRegion,
  isValidLinodeRegion,
  isValidUrl,
  getDangerousExtensions,
  getFileExtension,
  formatBytes
};