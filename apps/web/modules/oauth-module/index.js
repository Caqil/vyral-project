const OAuthService = require('./services/oauth-service');
const ProviderService = require('./services/provider-service');
const TokenService = require('./services/token-service');
const { validateConfig, validateProvider } = require('./utils/validators');

class OAuthModule {
  constructor(config = {}) {
    this.config = config;
    this.name = 'oauth-auth';
    this.version = '1.0.0';
    
    // Statistics
    this.stats = {
      totalLogins: 0,
      providerLogins: {},
      tokensRefreshed: 0,
      errors: 0
    };
    
    console.log('🔐 OAuth Module constructor called');
  }

  async initialize() {
    console.log('🔐 OAuth Authentication Module initializing...');
    
    // Validate configuration
    const configErrors = validateConfig(this.config);
    if (configErrors.length > 0) {
      throw new Error(`OAuth configuration errors: ${configErrors.join(', ')}`);
    }
    
    // Initialize services
    this.oauthService = new OAuthService(this.config);
    this.providerService = new ProviderService(this.config);
    this.tokenService = new TokenService(this.config);
    
    // Initialize enabled providers
    await this.initializeProviders();
    
    console.log('✅ OAuth Module initialized successfully!');
    console.log(`📊 Enabled providers: ${this.config.enabled_providers?.join(', ')}`);
  }

  async cleanup() {
    console.log('🧹 OAuth Module cleanup...');
    
    // Clear any active sessions or timers
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }
    
    console.log('📊 OAuth Module Statistics:');
    console.log(`   Total logins: ${this.stats.totalLogins}`);
    console.log(`   Tokens refreshed: ${this.stats.tokensRefreshed}`);
    console.log(`   Errors: ${this.stats.errors}`);
    
    console.log('👋 OAuth Module deactivated');
  }

  async updateConfig(newConfig) {
    console.log('🔄 OAuth Module config updated:', Object.keys(newConfig));
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize providers if enabled providers changed
    if (newConfig.enabled_providers) {
      await this.initializeProviders();
    }
    
    // Update services with new config
    if (this.oauthService) this.oauthService.updateConfig(this.config);
    if (this.providerService) this.providerService.updateConfig(this.config);
    if (this.tokenService) this.tokenService.updateConfig(this.config);
  }

  async initializeProviders() {
    const enabledProviders = this.config.enabled_providers || [];
    console.log(`🔧 Initializing ${enabledProviders.length} OAuth providers...`);
    
    for (const provider of enabledProviders) {
      try {
        await this.providerService.initializeProvider(provider);
        console.log(`   ✅ ${provider} provider initialized`);
      } catch (error) {
        console.error(`   ❌ Failed to initialize ${provider}:`, error.message);
        this.stats.errors++;
      }
    }
  }

  // API Route Handlers
  async getProviders(req, res) {
    try {
      console.log('📞 GET /api/oauth/providers');
      
      const enabledProviders = this.config.enabled_providers || [];
      const providers = await this.providerService.getEnabledProviders(enabledProviders);
      
      res.json({
        success: true,
        data: {
          providers,
          count: providers.length
        }
      });
    } catch (error) {
      console.error('❌ Get providers error:', error);
      this.stats.errors++;
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async initiateAuth(req, res) {
    try {
      const { provider } = req.params;
      const { redirect_uri, state } = req.query;
      
      console.log(`📞 GET /api/oauth/auth/${provider}`);
      
      if (!this.config.enabled_providers?.includes(provider)) {
        return res.status(400).json({
          success: false,
          error: `Provider ${provider} is not enabled`
        });
      }
      
      const authUrl = await this.oauthService.getAuthorizationUrl(provider, {
        redirect_uri,
        state
      });
      
      res.json({
        success: true,
        data: {
          authUrl,
          provider,
          state
        }
      });
    } catch (error) {
      console.error(`❌ Initiate auth error for ${req.params.provider}:`, error);
      this.stats.errors++;
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async handleCallback(req, res) {
    try {
      const { provider } = req.params;
      const { code, state, error } = req.query;
      
      console.log(`📞 GET /api/oauth/callback/${provider}`);
      
      if (error) {
        return res.status(400).json({
          success: false,
          error: `OAuth error: ${error}`
        });
      }
      
      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'Authorization code not provided'
        });
      }
      
      // Exchange code for token
      const tokenData = await this.oauthService.exchangeCodeForToken(provider, code);
      
      // Get user profile
      const userProfile = await this.oauthService.getUserProfile(provider, tokenData.access_token);
      
      // Handle user authentication/creation
      const authResult = await this.handleUserAuth(provider, userProfile, tokenData);
      
      this.stats.totalLogins++;
      this.stats.providerLogins[provider] = (this.stats.providerLogins[provider] || 0) + 1;
      
      res.json({
        success: true,
        data: authResult
      });
    } catch (error) {
      console.error(`❌ OAuth callback error for ${req.params.provider}:`, error);
      this.stats.errors++;
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const { provider, refresh_token } = req.body;
      const userId = req.user?.id;
      
      console.log(`📞 POST /api/oauth/refresh for ${provider}`);
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }
      
      const newTokenData = await this.tokenService.refreshToken(userId, provider, refresh_token);
      
      this.stats.tokensRefreshed++;
      
      res.json({
        success: true,
        data: newTokenData
      });
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      this.stats.errors++;
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async disconnectProvider(req, res) {
    try {
      const { provider } = req.params;
      const userId = req.user?.id;
      
      console.log(`📞 DELETE /api/oauth/disconnect/${provider}`);
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }
      
      await this.tokenService.revokeToken(userId, provider);
      
      res.json({
        success: true,
        message: `${provider} account disconnected successfully`
      });
    } catch (error) {
      console.error(`❌ Disconnect error for ${req.params.provider}:`, error);
      this.stats.errors++;
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getOAuthStats(req, res) {
    try {
      console.log('📞 GET /api/admin/oauth/stats');
      
      const dbStats = await this.tokenService.getUsageStats();
      
      const stats = {
        ...this.stats,
        ...dbStats,
        enabledProviders: this.config.enabled_providers?.length || 0,
        autoCreateUsers: this.config.auto_create_users,
        accountLinking: this.config.allow_account_linking
      };
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('❌ Get OAuth stats error:', error);
      this.stats.errors++;
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Helper Methods
  async handleUserAuth(provider, profile, tokenData) {
    try {
      // Check if user exists by OAuth provider ID
      let user = await this.findUserByOAuthId(provider, profile.id);
      
      if (!user) {
        if (this.config.auto_create_users) {
          // Create new user from OAuth profile
          user = await this.createUserFromOAuth(provider, profile);
        } else {
          throw new Error('User not found and auto-creation is disabled');
        }
      }
      
      // Store/update OAuth token
      await this.tokenService.storeToken(user.id, provider, tokenData);
      
      // Update user's OAuth profile data
      await this.updateUserOAuthData(user.id, provider, profile);
      
      return {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatar: user.avatar
        },
        provider,
        tokenStored: true
      };
    } catch (error) {
      console.error('❌ User auth handling error:', error);
      throw error;
    }
  }

  async findUserByOAuthId(provider, oauthId) {
    // This would integrate with your user service
    // Placeholder implementation
    return null;
  }

  async createUserFromOAuth(provider, profile) {
    // This would integrate with your user service to create a new user
    // Placeholder implementation
    return {
      id: 'new-user-id',
      email: profile.email,
      displayName: profile.name,
      avatar: profile.avatar
    };
  }

  async updateUserOAuthData(userId, provider, profile) {
    // Update user's OAuth profile data in database
    // Placeholder implementation
    console.log(`📝 Updating OAuth data for user ${userId}, provider ${provider}`);
  }

  // Event Hook Handlers
  async onUserLogin(loginData) {
    console.log('🎯 OAuth Module: User login event received');
    
    // Track OAuth logins vs regular logins
    if (loginData.method === 'oauth') {
      this.stats.totalLogins++;
      const provider = loginData.provider;
      this.stats.providerLogins[provider] = (this.stats.providerLogins[provider] || 0) + 1;
    }
  }

  async onUserRegistered(userData) {
    console.log('🎯 OAuth Module: User registered event received');
    
    // If user was created via OAuth, set up initial OAuth data
    if (userData.createdVia === 'oauth') {
      console.log(`👤 New user registered via ${userData.provider} OAuth`);
    }
  }

  async onProfileUpdated(updateData) {
    console.log('🎯 OAuth Module: Profile updated event received');
    
    // Sync profile updates to OAuth provider if needed
    // Implementation would depend on provider capabilities
  }

  // Utility Methods
  getStats() {
    return {
      ...this.stats,
      enabledProviders: this.config.enabled_providers || [],
      config: {
        autoCreateUsers: this.config.auto_create_users,
        accountLinking: this.config.allow_account_linking,
        sessionDuration: this.config.session_duration
      }
    };
  }
}

module.exports = OAuthModule;