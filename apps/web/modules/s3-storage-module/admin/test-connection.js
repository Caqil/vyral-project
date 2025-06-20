const { 
  asyncHandler, 
  S3ValidationError,
  S3ConnectionError,
  logInfo,
  logError,
  retryWithBackoff
} = require('../utils/error-handler');
const { validateProvider } = require('../utils/validators');
const ProviderFactory = require('../services/provider-factory');

/**
 * S3 Storage Module - Test Connection API Handler
 * Handles connection testing for S3 providers
 */

/**
 * Test connection to S3 provider with current configuration
 */
const testCurrentConnection = asyncHandler(async (req, res) => {
  try {
    logInfo('🔧 Testing connection with current configuration');
    
    // Get the S3 storage module instance
    const s3Module = req.app.locals.s3StorageModule;
    if (!s3Module) {
      throw new S3ValidationError('S3 Storage module not found');
    }

    if (!s3Module.activeProvider) {
      throw new S3ValidationError('No S3 provider configured');
    }

    // Test the current provider connection
    const testResult = await retryWithBackoff(
      () => s3Module.activeProvider.testConnection(),
      { maxRetries: 2, baseDelay: 1000 }
    );

    // Get additional provider information
    const providerInfo = s3Module.activeProvider.getProviderInfo();
    
    // Test URL generation if provider is working
    let urlTest = null;
    try {
      const testKey = 'test-file.jpg';
      const testUrl = await s3Module.urlService.generateUrl(testKey, {
        provider: s3Module.activeProvider,
        isPrivate: false,
        skipStats: true
      });
      urlTest = { success: true, url: testUrl };
    } catch (error) {
      urlTest = { success: false, error: error.message };
    }

    const response = {
      success: true,
      data: {
        provider: s3Module.activeProvider.type,
        connection: testResult,
        providerInfo: providerInfo,
        urlGeneration: urlTest,
        configuration: {
          bucket: s3Module.config.bucket_name,
          region: s3Module.config.aws_region,
          publicUrl: s3Module.config.public_url,
          cdnEnabled: !!s3Module.config.cdn_domain
        },
        timestamp: new Date().toISOString()
      },
      message: 'Connection test completed successfully'
    };

    logInfo(`✅ Connection test passed for ${s3Module.activeProvider.type}`);
    res.json(response);

  } catch (error) {
    logError('❌ Current connection test failed:', error);
    
    const response = {
      success: false,
      error: {
        message: error.message,
        type: error.name || 'ConnectionError',
        code: error.code || 'CONNECTION_FAILED'
      },
      timestamp: new Date().toISOString()
    };

    res.status(400).json(response);
  }
});

/**
 * Test connection with custom configuration
 */
const testCustomConnection = asyncHandler(async (req, res) => {
  try {
    const {
      provider,
      aws_access_key_id,
      aws_secret_access_key,
      aws_region,
      bucket_name,
      custom_endpoint,
      cloudflare_account_id,
      force_path_style = false
    } = req.body;

    logInfo(`🔧 Testing custom connection for provider: ${provider}`);

    if (!provider) {
      throw new S3ValidationError('Provider is required');
    }

    // Validate provider configuration
    const configErrors = validateProvider(provider, req.body);
    if (configErrors.length > 0) {
      throw new S3ValidationError(`Configuration errors: ${configErrors.join(', ')}`);
    }

    // Create test configuration
    const testConfig = {
      storage_provider: provider,
      aws_access_key_id,
      aws_secret_access_key,
      aws_region,
      bucket_name,
      custom_endpoint,
      cloudflare_account_id,
      account_id: cloudflare_account_id, // Alternative field name
      force_path_style
    };

    // Create provider factory and test provider
    const providerFactory = new ProviderFactory();
    const testProvider = await providerFactory.createProvider(provider, testConfig);

    // Test connection with retry
    const testResult = await retryWithBackoff(
      () => testProvider.testConnection(),
      { maxRetries: 3, baseDelay: 1000 }
    );

    // Get provider information
    const providerInfo = testProvider.getProviderInfo();

    // Test basic operations
    const operationTests = await performOperationTests(testProvider);

    // Get provider recommendations
    const recommendations = getProviderRecommendations(provider, testConfig);

    const response = {
      success: true,
      data: {
        provider: provider,
        connection: testResult,
        providerInfo: providerInfo,
        operationTests: operationTests,
        recommendations: recommendations,
        configuration: {
          valid: true,
          bucket: bucket_name,
          region: aws_region,
          endpoint: custom_endpoint || testResult.endpoint
        },
        timestamp: new Date().toISOString()
      },
      message: 'Custom connection test completed successfully'
    };

    logInfo(`✅ Custom connection test passed for ${provider}`);
    res.json(response);

  } catch (error) {
    logError('❌ Custom connection test failed:', error);
    
    const response = {
      success: false,
      error: {
        message: error.message,
        type: error.name || 'ConnectionError',
        code: error.code || 'CONNECTION_FAILED',
        provider: req.body.provider
      },
      timestamp: new Date().toISOString()
    };

    res.status(400).json(response);
  }
});

/**
 * Get available providers and their requirements
 */
const getAvailableProviders = asyncHandler(async (req, res) => {
  try {
    logInfo('📋 Getting available providers');

    const providerFactory = new ProviderFactory();
    const availableProviders = providerFactory.getAvailableProviders();

    // Add configuration requirements for each provider
    const providersWithRequirements = availableProviders.map(provider => ({
      ...provider,
      requirements: getProviderRequirements(provider.id),
      setupGuide: `/modules/s3-storage/docs/provider-setup/${provider.id}.md`,
      estimatedSetupTime: getEstimatedSetupTime(provider.id)
    }));

    const response = {
      success: true,
      data: {
        providers: providersWithRequirements,
        total: providersWithRequirements.length,
        categories: {
          majorCloud: ['aws-s3'],
          affordable: ['vultr-storage', 'linode-storage'],
          edgeOptimized: ['cloudflare-r2'],
          developmentFriendly: ['digitalocean-spaces'],
          enterpriseReady: ['aws-s3', 'cloudflare-r2']
        }
      },
      message: 'Available providers retrieved successfully'
    };

    res.json(response);

  } catch (error) {
    logError('❌ Get available providers failed:', error);
    throw error;
  }
});

/**
 * Test multiple providers with same configuration
 */
const testMultipleProviders = asyncHandler(async (req, res) => {
  try {
    const { providers, baseConfig } = req.body;

    if (!providers || !Array.isArray(providers) || providers.length === 0) {
      throw new S3ValidationError('Providers array is required');
    }

    if (!baseConfig) {
      throw new S3ValidationError('Base configuration is required');
    }

    logInfo(`🔧 Testing multiple providers: ${providers.join(', ')}`);

    const results = [];
    const providerFactory = new ProviderFactory();

    for (const provider of providers) {
      try {
        // Create provider-specific config
        const providerConfig = {
          ...baseConfig,
          storage_provider: provider
        };

        // Validate configuration
        const configErrors = validateProvider(provider, providerConfig);
        if (configErrors.length > 0) {
          results.push({
            provider,
            success: false,
            error: `Configuration errors: ${configErrors.join(', ')}`,
            timestamp: new Date().toISOString()
          });
          continue;
        }

        // Test provider
        const testProvider = await providerFactory.createProvider(provider, providerConfig);
        const testResult = await testProvider.testConnection();
        const providerInfo = testProvider.getProviderInfo();

        results.push({
          provider,
          success: true,
          connection: testResult,
          providerInfo: providerInfo,
          timestamp: new Date().toISOString()
        });

        logInfo(`✅ ${provider} test passed`);

      } catch (error) {
        results.push({
          provider,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });

        logError(`❌ ${provider} test failed:`, error);
      }
    }

    // Generate recommendation based on results
    const recommendation = generateProviderRecommendation(results);

    const response = {
      success: true,
      data: {
        results: results,
        summary: {
          total: providers.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        },
        recommendation: recommendation
      },
      message: 'Multiple provider test completed'
    };

    logInfo(`📊 Multiple provider test: ${results.filter(r => r.success).length}/${providers.length} passed`);
    res.json(response);

  } catch (error) {
    logError('❌ Multiple provider test failed:', error);
    throw error;
  }
});

/**
 * Perform basic operation tests on a provider
 * @param {object} provider - Provider instance
 * @returns {Promise<object>} Operation test results
 */
async function performOperationTests(provider) {
  const tests = {
    listObjects: { success: false, error: null },
    generateUrl: { success: false, error: null },
    metadata: { success: false, error: null }
  };

  // Test list objects
  try {
    await provider.listObjects({ maxKeys: 1 });
    tests.listObjects.success = true;
  } catch (error) {
    tests.listObjects.error = error.message;
  }

  // Test URL generation
  try {
    const testUrl = provider.generatePublicUrl('test-file.jpg');
    tests.generateUrl.success = !!testUrl;
    tests.generateUrl.url = testUrl;
  } catch (error) {
    tests.generateUrl.error = error.message;
  }

  // Test metadata retrieval (on non-existent file, should return 404)
  try {
    const testKey = `test-${Date.now()}.txt`;
    const result = await provider.getObjectMetadata(testKey);
    tests.metadata.success = !result.success; // Should fail for non-existent file
  } catch (error) {
    // Expected for non-existent file
    tests.metadata.success = true;
  }

  return tests;
}

/**
 * Get configuration requirements for a provider
 * @param {string} providerId - Provider ID
 * @returns {object} Configuration requirements
 */
function getProviderRequirements(providerId) {
  const commonRequirements = [
    { field: 'aws_access_key_id', label: 'Access Key ID', type: 'string', required: true },
    { field: 'aws_secret_access_key', label: 'Secret Access Key', type: 'password', required: true },
    { field: 'bucket_name', label: 'Bucket Name', type: 'string', required: true }
  ];

  switch (providerId) {
    case 'aws-s3':
      return [
        ...commonRequirements,
        { field: 'aws_region', label: 'AWS Region', type: 'select', required: true, 
          options: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'] }
      ];
    
    case 'cloudflare-r2':
      return [
        ...commonRequirements,
        { field: 'cloudflare_account_id', label: 'Account ID', type: 'string', required: true },
        { field: 'r2_dev_subdomain', label: 'R2.dev Subdomain', type: 'string', required: false }
      ];
    
    case 'vultr-storage':
      return [
        ...commonRequirements,
        { field: 'aws_region', label: 'Region', type: 'select', required: true,
          options: ['ewr1', 'sjc1', 'ams1'] }
      ];
    
    case 'digitalocean-spaces':
      return [
        ...commonRequirements,
        { field: 'aws_region', label: 'Region', type: 'select', required: true,
          options: ['nyc3', 'ams3', 'sgp1', 'fra1'] }
      ];
    
    case 'linode-storage':
      return [
        ...commonRequirements,
        { field: 'aws_region', label: 'Region', type: 'select', required: true,
          options: ['us-east-1', 'eu-central-1', 'ap-south-1'] }
      ];
    
    default:
      return commonRequirements;
  }
}

/**
 * Get estimated setup time for a provider
 * @param {string} providerId - Provider ID
 * @returns {string} Estimated setup time
 */
function getEstimatedSetupTime(providerId) {
  const setupTimes = {
    'aws-s3': '15-30 minutes',
    'cloudflare-r2': '10-20 minutes',
    'vultr-storage': '5-15 minutes',
    'digitalocean-spaces': '10-20 minutes',
    'linode-storage': '5-15 minutes'
  };

  return setupTimes[providerId] || '10-20 minutes';
}

/**
 * Get provider-specific recommendations
 * @param {string} providerId - Provider ID
 * @param {object} config - Configuration object
 * @returns {object} Recommendations
 */
function getProviderRecommendations(providerId, config) {
  const baseRecommendations = {
    security: ['Use IAM users with minimal required permissions', 'Enable MFA on your account'],
    performance: ['Choose a region close to your users', 'Configure appropriate cache headers'],
    cost: ['Monitor usage and billing', 'Consider lifecycle policies for old files']
  };

  switch (providerId) {
    case 'aws-s3':
      return {
        ...baseRecommendations,
        setup: ['Consider enabling S3 Transfer Acceleration', 'Set up CloudFront for global CDN'],
        advanced: ['Enable versioning for important files', 'Use S3 Intelligent Tiering for cost optimization']
      };
    
    case 'cloudflare-r2':
      return {
        ...baseRecommendations,
        setup: ['Set up a custom domain for public access', 'Configure R2.dev subdomain for testing'],
        advantages: ['Zero egress fees', 'Global edge network included']
      };
    
    default:
      return baseRecommendations;
  }
}

/**
 * Generate provider recommendation based on test results
 * @param {Array} results - Test results for multiple providers
 * @returns {object} Recommendation
 */
function generateProviderRecommendation(results) {
  const successful = results.filter(r => r.success);
  
  if (successful.length === 0) {
    return {
      recommended: null,
      reason: 'No providers passed the connection test',
      suggestions: ['Check your credentials', 'Verify network connectivity', 'Review configuration requirements']
    };
  }

  // Simple recommendation logic (you could make this more sophisticated)
  let recommended = successful[0];
  let reason = 'First successful provider';

  // Prefer Cloudflare R2 for cost efficiency
  const r2Result = successful.find(r => r.provider === 'cloudflare-r2');
  if (r2Result) {
    recommended = r2Result;
    reason = 'Cloudflare R2 offers zero egress fees and good performance';
  }

  // Prefer AWS S3 for enterprise needs
  const awsResult = successful.find(r => r.provider === 'aws-s3');
  if (awsResult && successful.length > 2) {
    recommended = awsResult;
    reason = 'AWS S3 provides the most comprehensive feature set';
  }

  return {
    recommended: recommended.provider,
    reason: reason,
    alternatives: successful.filter(r => r.provider !== recommended.provider).map(r => r.provider),
    considerations: getProviderRecommendations(recommended.provider, {})
  };
}

/**
 * Middleware to check test permissions
 */
const checkTestPermissions = asyncHandler(async (req, res, next) => {
  // Check if user has configuration permissions
  if (!req.user) {
    throw new S3ValidationError('Authentication required for connection testing');
  }

  const userPermissions = req.user.permissions || [];
  const hasConfigPermission = userPermissions.includes('storage.configure') || 
                             userPermissions.includes('storage.admin') ||
                             req.user.role === 'admin';

  if (!hasConfigPermission) {
    throw new S3ValidationError('Insufficient permissions for connection testing');
  }

  next();
});

// Export route handlers
module.exports = {
  // Route handlers with middleware
  testCurrentConnection: [checkTestPermissions, testCurrentConnection],
  testCustomConnection: [checkTestPermissions, testCustomConnection],
  getAvailableProviders: [getAvailableProviders], // No auth required for listing
  testMultipleProviders: [checkTestPermissions, testMultipleProviders],
  
  // Individual functions for testing
  _testCurrentConnection: testCurrentConnection,
  _testCustomConnection: testCustomConnection,
  _getAvailableProviders: getAvailableProviders,
  _testMultipleProviders: testMultipleProviders
};