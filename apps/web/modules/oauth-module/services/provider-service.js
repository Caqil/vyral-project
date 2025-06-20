class ProviderService {
  constructor(config) {
    this.config = config;
    this.providerConfigs = this.getProviderConfigs();
  }

  updateConfig(newConfig) {
    this.config = newConfig;
  }

  getProviderConfigs() {
    return {
      google: {
        name: 'Google',
        icon: '🔍',
        color: '#4285f4',
        description: 'Sign in with your Google account',
        scopes: ['openid', 'email', 'profile']
      },
      github: {
        name: 'GitHub',
        icon: '🐙',
        color: '#333333',
        description: 'Sign in with your GitHub account',
        scopes: ['user:email']
      },
      facebook: {
        name: 'Facebook',
        icon: '📘',
        color: '#1877f2',
        description: 'Sign in with your Facebook account',
        scopes: ['email', 'public_profile']
      },
      twitter: {
        name: 'Twitter/X',
        icon: '🐦',
        color: '#1da1f2',
        description: 'Sign in with your Twitter account',
        scopes: ['tweet.read', 'users.read']
      },
      discord: {
        name: 'Discord',
        icon: '🎮',
        color: '#5865f2',
        description: 'Sign in with your Discord account',
        scopes: ['identify', 'email']
      },
      linkedin: {
        name: 'LinkedIn',
        icon: '💼',
        color: '#0a66c2',
        description: 'Sign in with your LinkedIn account',
        scopes: ['r_liteprofile', 'r_emailaddress']
      }
    };
  }

  async getEnabledProviders(enabledList) {
    const providers = [];
    
    for (const providerSlug of enabledList) {
      const config = this.providerConfigs[providerSlug];
      if (config) {
        const isConfigured = await this.isProviderConfigured(providerSlug);
        
        providers.push({
          slug: providerSlug,
          ...config,
          configured: isConfigured,
          enabled: true
        });
      }
    }
    
    return providers;
  }

  async isProviderConfigured(provider) {
    switch (provider) {
      case 'google':
        return !!(this.config.google_client_id && this.config.google_client_secret);
      case 'github':
        return !!(this.config.github_client_id && this.config.github_client_secret);
      case 'facebook':
        return !!(this.config.facebook_app_id && this.config.facebook_app_secret);
      case 'twitter':
        return !!(this.config.twitter_client_id && this.config.twitter_client_secret);
      case 'discord':
        return !!(this.config.discord_client_id && this.config.discord_client_secret);
      case 'linkedin':
        return !!(this.config.linkedin_client_id && this.config.linkedin_client_secret);
      default:
        return false;
    }
  }

  async initializeProvider(provider) {
    const isConfigured = await this.isProviderConfigured(provider);
    
    if (!isConfigured) {
      throw new Error(`Provider ${provider} is not properly configured`);
    }
    
    console.log(`✅ ${provider} provider initialized`);
    return true;
  }
}

module.exports = ProviderService;