const axios = require('axios');
const crypto = require('crypto');
const querystring = require('querystring');

// Import provider configurations
const GoogleProvider = require('../providers/google');
const GitHubProvider = require('../providers/github');
const FacebookProvider = require('../providers/facebook');
const TwitterProvider = require('../providers/twitter');
const DiscordProvider = require('../providers/discord');
const LinkedInProvider = require('../providers/linkedin');

class OAuthService {
  constructor(config) {
    this.config = config;
    this.providers = {};
    this.initializeProviders();
  }

  updateConfig(newConfig) {
    this.config = newConfig;
    this.initializeProviders();
  }

  initializeProviders() {
    // Initialize each provider with configuration
    this.providers.google = new GoogleProvider({
      clientId: this.config.google_client_id,
      clientSecret: this.config.google_client_secret
    });

    this.providers.github = new GitHubProvider({
      clientId: this.config.github_client_id,
      clientSecret: this.config.github_client_secret
    });

    this.providers.facebook = new FacebookProvider({
      appId: this.config.facebook_app_id,
      appSecret: this.config.facebook_app_secret
    });

    this.providers.twitter = new TwitterProvider({
      clientId: this.config.twitter_client_id,
      clientSecret: this.config.twitter_client_secret
    });

    this.providers.discord = new DiscordProvider({
      clientId: this.config.discord_client_id,
      clientSecret: this.config.discord_client_secret
    });

    this.providers.linkedin = new LinkedInProvider({
      clientId: this.config.linkedin_client_id,
      clientSecret: this.config.linkedin_client_secret
    });
  }

  async getAuthorizationUrl(provider, options = {}) {
    const providerInstance = this.providers[provider];
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`);
    }

    // Generate state parameter for security
    const state = options.state || crypto.randomBytes(32).toString('hex');
    
    return providerInstance.getAuthorizationUrl({
      ...options,
      state
    });
  }

  async exchangeCodeForToken(provider, code, options = {}) {
    const providerInstance = this.providers[provider];
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`);
    }

    return await providerInstance.exchangeCodeForToken(code, options);
  }

  async getUserProfile(provider, accessToken) {
    const providerInstance = this.providers[provider];
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`);
    }

    return await providerInstance.getUserProfile(accessToken);
  }

  async refreshToken(provider, refreshToken) {
    const providerInstance = this.providers[provider];
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`);
    }

    if (!providerInstance.refreshToken) {
      throw new Error(`Provider ${provider} does not support token refresh`);
    }

    return await providerInstance.refreshToken(refreshToken);
  }

  getProviderConfig(provider) {
    const providerInstance = this.providers[provider];
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`);
    }

    return providerInstance.getConfig();
  }
}

module.exports = OAuthService;