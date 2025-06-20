const path = require('path');
const fs = require('fs');

class ProviderFactory {
  constructor() {
    this.providers = new Map();
    this.providerConfig = this.loadProviderConfig();
    this.loadAvailableProviders();
  }

  /**
   * Load provider configuration from config/providers.json
   */
  loadProviderConfig() {
    try {
      const configPath = path.join(__dirname, '..', 'config', 'providers.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.warn('⚠️ Could not load provider config, using defaults');
      return this.getDefaultProviderConfig();
    }
  }

  /**
   * Get default provider configuration
   */
  getDefaultProviderConfig() {
    return {
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
  }

  /**
   * Dynamically load all available provider classes
   */
  loadAvailableProviders() {
    const providersDir = path.join(__dirname, '..', 'providers');
    
    if (!fs.existsSync(providersDir)) {
      console.warn('⚠️ Providers directory not found');
      return;
    }

    const providerFiles = fs.readdirSync(providersDir)
      .filter(file => file.endsWith('.js') && file !== 'base-provider.js');

    for (const file of providerFiles) {
      try {
        const providerName = path.basename(file, '.js');
        const ProviderClass = require(path.join(providersDir, file));
        this.providers.set(providerName, ProviderClass);
        console.log(`📦 Loaded provider: ${providerName}`);
      } catch (error) {
        console.warn(`⚠️ Failed to load provider ${file}:`, error.message);
      }
    }
  }

  /**
   * Create a provider instance
   * @param {string} providerType - The type of provider (e.g., 'aws-s3', 'vultr-storage')
   * @param {object} config - Configuration object for the provider
   * @returns {BaseS3Provider} Provider instance
   */
  async createProvider(providerType, config) {
    if (!providerType || providerType === 'local') {
      throw new Error('Local storage provider does not require S3 provider instance');
    }

    const ProviderClass = this.providers.get(providerType);
    if (!ProviderClass) {
      throw new Error(`Unknown provider type: ${providerType}. Available providers: ${Array.from(this.providers.keys()).join(', ')}`);
    }

    // Get provider-specific configuration
    const providerConfig = this.providerConfig[providerType];
    if (!providerConfig) {
      throw new Error(`No configuration found for provider: ${providerType}`);
    }

    // Merge provider defaults with user configuration
    const mergedConfig = {
      ...providerConfig,
      ...config,
      providerType
    };

    // Validate required configuration
    this.validateProviderConfig(providerType, mergedConfig);

    try {
      const provider = new ProviderClass(mergedConfig);
      console.log(`✅ Created ${providerType} provider instance`);
      return provider;
    } catch (error) {
      console.error(`❌ Failed to create ${providerType} provider:`, error);
      throw new Error(`Failed to initialize ${providerType} provider: ${error.message}`);
    }
  }

  /**
   * Validate provider configuration
   * @param {string} providerType - The provider type
   * @param {object} config - Configuration to validate
   */
  validateProviderConfig(providerType, config) {
    const requiredFields = this.getRequiredFields(providerType);
    const missing = [];

    for (const field of requiredFields) {
      if (!config[field] || config[field].trim() === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing required configuration for ${providerType}: ${missing.join(', ')}`);
    }

    // Validate region if specified
    if (config.aws_region) {
      const validRegions = this.providerConfig[providerType]?.regions || [];
      if (validRegions.length > 0 && !validRegions.includes(config.aws_region)) {
        console.warn(`⚠️ Region ${config.aws_region} may not be supported by ${providerType}`);
      }
    }
  }

  /**
   * Get required configuration fields for a provider
   * @param {string} providerType - The provider type
   * @returns {string[]} Array of required field names
   */
  getRequiredFields(providerType) {
    const commonFields = ['aws_access_key_id', 'aws_secret_access_key', 'bucket_name'];
    
    switch (providerType) {
      case 'aws-s3':
        return [...commonFields, 'aws_region'];
      
      case 'vultr-storage':
        return [...commonFields, 'aws_region'];
      
      case 'cloudflare-r2':
        return ['aws_access_key_id', 'aws_secret_access_key', 'bucket_name'];
      
      case 'digitalocean-spaces':
        return [...commonFields, 'aws_region'];
      
      case 'linode-storage':
        return [...commonFields, 'aws_region'];
      
      case 'custom-s3':
        return [...commonFields, 'custom_endpoint'];
      
      default:
        return commonFields;
    }
  }

  /**
   * Get available providers with their metadata
   * @returns {object[]} Array of provider information
   */
  getAvailableProviders() {
    const providers = [];
    
    for (const [key, config] of Object.entries(this.providerConfig)) {
      providers.push({
        id: key,
        name: config.name,
        endpoint: config.endpoint,
        supportsAcceleration: config.supportsAcceleration,
        supportsVersioning: config.supportsVersioning,
        regions: config.regions,
        available: this.providers.has(key)
      });
    }

    return providers;
  }

  /**
   * Check if a provider is available
   * @param {string} providerType - The provider type to check
   * @returns {boolean} True if provider is available
   */
  isProviderAvailable(providerType) {
    return this.providers.has(providerType);
  }

  /**
   * Get provider configuration by type
   * @param {string} providerType - The provider type
   * @returns {object|null} Provider configuration or null if not found
   */
  getProviderConfig(providerType) {
    return this.providerConfig[providerType] || null;
  }

  /**
   * Get endpoint URL for a provider
   * @param {string} providerType - The provider type
   * @param {string} region - The region (optional)
   * @returns {string} Endpoint URL
   */
  getProviderEndpoint(providerType, region = null) {
    const config = this.getProviderConfig(providerType);
    if (!config) {
      throw new Error(`Unknown provider: ${providerType}`);
    }

    let endpoint = config.endpoint;

    // Handle region-specific endpoints
    switch (providerType) {
      case 'aws-s3':
        if (region && region !== 'us-east-1') {
          endpoint = `s3.${region}.amazonaws.com`;
        }
        break;
      
      case 'vultr-storage':
        if (region) {
          endpoint = `${region}.vultrobjects.com`;
        }
        break;
      
      case 'digitalocean-spaces':
        if (region) {
          endpoint = `${region}.digitaloceanspaces.com`;
        }
        break;
      
      case 'linode-storage':
        if (region) {
          endpoint = `${region}.linodeobjects.com`;
        }
        break;
      
      case 'cloudflare-r2':
        // R2 uses account-specific endpoints
        endpoint = 'cloudflare-r2'; // This will be handled by the provider
        break;
    }

    return endpoint;
  }

  /**
   * Test if a provider configuration is valid by attempting to create it
   * @param {string} providerType - The provider type
   * @param {object} config - Configuration to test
   * @returns {Promise<boolean>} True if configuration is valid
   */
  async testProviderConfig(providerType, config) {
    try {
      const provider = await this.createProvider(providerType, config);
      await provider.testConnection();
      return true;
    } catch (error) {
      console.error(`❌ Provider config test failed for ${providerType}:`, error);
      return false;
    }
  }

  /**
   * Get provider recommendations based on use case
   * @param {object} requirements - Requirements object
   * @returns {object[]} Recommended providers
   */
  getProviderRecommendations(requirements = {}) {
    const {
      budget = 'medium',
      performance = 'medium',
      regions = [],
      features = []
    } = requirements;

    const recommendations = [];
    
    for (const [key, config] of Object.entries(this.providerConfig)) {
      let score = 0;
      let reasons = [];

      // Budget scoring
      if (budget === 'low') {
        if (key === 'vultr-storage' || key === 'linode-storage') {
          score += 3;
          reasons.push('Cost-effective pricing');
        }
      } else if (budget === 'high') {
        if (key === 'aws-s3') {
          score += 3;
          reasons.push('Enterprise-grade features');
        }
      }

      // Performance scoring
      if (performance === 'high') {
        if (key === 'aws-s3' && config.supportsAcceleration) {
          score += 2;
          reasons.push('Transfer acceleration available');
        }
        if (key === 'cloudflare-r2') {
          score += 2;
          reasons.push('Global CDN network');
        }
      }

      // Region scoring
      if (regions.length > 0) {
        const matchingRegions = regions.filter(r => config.regions.includes(r));
        if (matchingRegions.length > 0) {
          score += matchingRegions.length;
          reasons.push(`Available in ${matchingRegions.length} requested region(s)`);
        }
      }

      // Feature scoring
      if (features.includes('versioning') && config.supportsVersioning) {
        score += 1;
        reasons.push('File versioning supported');
      }

      if (score > 0) {
        recommendations.push({
          provider: key,
          name: config.name,
          score,
          reasons,
          available: this.providers.has(key)
        });
      }
    }

    // Sort by score (highest first)
    return recommendations.sort((a, b) => b.score - a.score);
  }
}

module.exports = ProviderFactory;