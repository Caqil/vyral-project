const axios = require('axios');
const querystring = require('querystring');

class FacebookProvider {
  constructor(config) {
    this.appId = config.appId;
    this.appSecret = config.appSecret;
    this.authUrl = 'https://www.facebook.com/v18.0/dialog/oauth';
    this.tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
    this.profileUrl = 'https://graph.facebook.com/v18.0/me';
    this.scopes = ['email', 'public_profile'];
  }

  getAuthorizationUrl(options = {}) {
    const params = {
      client_id: this.appId,
      response_type: 'code',
      scope: options.scope || this.scopes.join(','),
      redirect_uri: options.redirect_uri,
      state: options.state
    };

    const queryStr = querystring.stringify(params);
    return `${this.authUrl}?${queryStr}`;
  }

  async exchangeCodeForToken(code, options = {}) {
    try {
      const params = {
        client_id: this.appId,
        client_secret: this.appSecret,
        code: code,
        redirect_uri: options.redirect_uri
      };

      const response = await axios.get(this.tokenUrl, {
        params: params
      });

      return response.data;
    } catch (error) {
      throw new Error(`Facebook token exchange failed: ${error.message}`);
    }
  }

  async getUserProfile(accessToken) {
    try {
      const fields = 'id,name,email,first_name,last_name,picture.type(large)';
      const response = await axios.get(this.profileUrl, {
        params: {
          fields: fields,
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
        provider: 'facebook',
        raw: profile
      };
    } catch (error) {
      throw new Error(`Facebook profile fetch failed: ${error.message}`);
    }
  }

  async refreshToken(refreshToken) {
    // Facebook access tokens are long-lived but can be extended
    try {
      const params = {
        grant_type: 'fb_exchange_token',
        client_id: this.appId,
        client_secret: this.appSecret,
        fb_exchange_token: refreshToken
      };

      const response = await axios.get(this.tokenUrl, {
        params: params
      });

      return response.data;
    } catch (error) {
      throw new Error(`Facebook token refresh failed: ${error.message}`);
    }
  }

  async revokeToken(token) {
    try {
      await axios.delete(`https://graph.facebook.com/v18.0/me/permissions`, {
        params: {
          access_token: token
        }
      });
      return true;
    } catch (error) {
      console.error('Facebook token revocation failed:', error.message);
      return false;
    }
  }

  getConfig() {
    return {
      name: 'Facebook',
      clientId: this.appId,
      scopes: this.scopes,
      authUrl: this.authUrl,
      tokenUrl: this.tokenUrl,
      profileUrl: this.profileUrl
    };
  }
}

module.exports = FacebookProvider;