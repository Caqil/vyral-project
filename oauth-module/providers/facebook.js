const axios = require('axios');
const querystring = require('querystring');

class FacebookProvider {
  constructor(config) {
    this.config = config;
    this.authUrl = 'https://www.facebook.com/v18.0/dialog/oauth';
    this.tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
    this.userInfoUrl = 'https://graph.facebook.com/v18.0/me';
  }

  getAuthorizationUrl(options = {}) {
    const params = {
      client_id: this.config.appId,
      redirect_uri: options.redirect_uri || `${process.env.NEXTAUTH_URL}/api/oauth/callback/facebook`,
      scope: 'email,public_profile',
      response_type: 'code',
      state: options.state
    };

    return `${this.authUrl}?${querystring.stringify(params)}`;
  }

  async exchangeCodeForToken(code, options = {}) {
    try {
      const response = await axios.get(this.tokenUrl, {
        params: {
          client_id: this.config.appId,
          client_secret: this.config.appSecret,
          redirect_uri: options.redirect_uri || `${process.env.NEXTAUTH_URL}/api/oauth/callback/facebook`,
          code
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Facebook token exchange failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async getUserProfile(accessToken) {
    try {
      const response = await axios.get(this.userInfoUrl, {
        params: {
          fields: 'id,name,email,first_name,last_name,picture.type(large)',
          access_token: accessToken
        }
      });

      const profile = response.data;
      return {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        firstName: profile.first_name,
        lastName: profile.last_name,
        avatar: profile.picture?.data?.url,
        provider: 'facebook'
      };
    } catch (error) {
      throw new Error(`Facebook profile fetch failed: ${error.message}`);
    }
  }

  async getLongLivedToken(shortLivedToken) {
    try {
      const response = await axios.get(this.tokenUrl, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.config.appId,
          client_secret: this.config.appSecret,
          fb_exchange_token: shortLivedToken
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Facebook long-lived token exchange failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  getConfig() {
    return {
      name: 'Facebook',
      slug: 'facebook',
      scopes: ['email', 'public_profile'],
      supportsRefresh: false
    };
  }
}

module.exports = FacebookProvider;