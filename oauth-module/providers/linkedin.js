const axios = require('axios');
const querystring = require('querystring');

class LinkedInProvider {
  constructor(config) {
    this.config = config;
    this.authUrl = 'https://www.linkedin.com/oauth/v2/authorization';
    this.tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
    this.userInfoUrl = 'https://api.linkedin.com/v2/userinfo';
  }

  getAuthorizationUrl(options = {}) {
    const params = {
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: options.redirect_uri || `${process.env.NEXTAUTH_URL}/api/oauth/callback/linkedin`,
      state: options.state,
      scope: 'openid profile email'
    };

    return `${this.authUrl}?${querystring.stringify(params)}`;
  }

  async exchangeCodeForToken(code, options = {}) {
    try {
      const response = await axios.post(this.tokenUrl, querystring.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: options.redirect_uri || `${process.env.NEXTAUTH_URL}/api/oauth/callback/linkedin`
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`LinkedIn token exchange failed: ${error.response?.data?.error_description || error.message}`);
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
        id: profile.sub,
        email: profile.email,
        name: profile.name,
        firstName: profile.given_name,
        lastName: profile.family_name,
        avatar: profile.picture,
        locale: profile.locale,
        provider: 'linkedin'
      };
    } catch (error) {
      throw new Error(`LinkedIn profile fetch failed: ${error.message}`);
    }
  }

  async refreshToken(refreshToken) {
    try {
      const response = await axios.post(this.tokenUrl, querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`LinkedIn token refresh failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  getConfig() {
    return {
      name: 'LinkedIn',
      slug: 'linkedin',
      scopes: ['openid', 'profile', 'email'],
      supportsRefresh: true
    };
  }
}

module.exports = LinkedInProvider;