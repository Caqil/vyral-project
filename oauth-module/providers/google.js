const axios = require('axios');
const querystring = require('querystring');

class GoogleProvider {
  constructor(config) {
    this.config = config;
    this.authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    this.tokenUrl = 'https://oauth2.googleapis.com/token';
    this.userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
  }

  getAuthorizationUrl(options = {}) {
    const params = {
      client_id: this.config.clientId,
      redirect_uri: options.redirect_uri || `${process.env.NEXTAUTH_URL}/api/oauth/callback/google`,
      response_type: 'code',
      scope: 'openid email profile',
      state: options.state,
      access_type: 'offline',
      prompt: 'consent'
    };

    return `${this.authUrl}?${querystring.stringify(params)}`;
  }

  async exchangeCodeForToken(code, options = {}) {
    try {
      const response = await axios.post(this.tokenUrl, {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: options.redirect_uri || `${process.env.NEXTAUTH_URL}/api/oauth/callback/google`
      });

      return response.data;
    } catch (error) {
      throw new Error(`Google token exchange failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  async getUserProfile(accessToken) {
    try {
      const response = await axios.get(this.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const profile = response.data;
      return {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        firstName: profile.given_name,
        lastName: profile.family_name,
        avatar: profile.picture,
        verified: profile.verified_email,
        provider: 'google'
      };
    } catch (error) {
      throw new Error(`Google profile fetch failed: ${error.message}`);
    }
  }

  async refreshToken(refreshToken) {
    try {
      const response = await axios.post(this.tokenUrl, {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      });

      return response.data;
    } catch (error) {
      throw new Error(`Google token refresh failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  getConfig() {
    return {
      name: 'Google',
      slug: 'google',
      scopes: ['openid', 'email', 'profile'],
      supportsRefresh: true
    };
  }
}

module.exports = GoogleProvider;