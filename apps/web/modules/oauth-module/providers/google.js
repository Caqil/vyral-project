const axios = require('axios');
const querystring = require('querystring');

class GoogleProvider {
  constructor(config) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    this.tokenUrl = 'https://oauth2.googleapis.com/token';
    this.profileUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
    this.scopes = ['openid', 'email', 'profile'];
  }

  getAuthorizationUrl(options = {}) {
    const params = {
      client_id: this.clientId,
      response_type: 'code',
      scope: options.scope || this.scopes.join(' '),
      redirect_uri: options.redirect_uri,
      state: options.state,
      access_type: 'offline',
      prompt: 'consent'
    };

    const queryStr = querystring.stringify(params);
    return `${this.authUrl}?${queryStr}`;
  }

  async exchangeCodeForToken(code, options = {}) {
    try {
      const data = {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: options.redirect_uri
      };

      const response = await axios.post(this.tokenUrl, querystring.stringify(data), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Google token exchange failed: ${error.message}`);
    }
  }

  async getUserProfile(accessToken) {
    try {
      const response = await axios.get(this.profileUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
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
        provider: 'google',
        raw: profile
      };
    } catch (error) {
      throw new Error(`Google profile fetch failed: ${error.message}`);
    }
  }

  async refreshToken(refreshToken) {
    try {
      const data = {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      };

      const response = await axios.post(this.tokenUrl, querystring.stringify(data), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Google token refresh failed: ${error.message}`);
    }
  }

  async revokeToken(token) {
    try {
      await axios.post(`https://oauth2.googleapis.com/revoke?token=${token}`);
      return true;
    } catch (error) {
      console.error('Google token revocation failed:', error.message);
      return false;
    }
  }

  getConfig() {
    return {
      name: 'Google',
      clientId: this.clientId,
      scopes: this.scopes,
      authUrl: this.authUrl,
      tokenUrl: this.tokenUrl,
      profileUrl: this.profileUrl
    };
  }
}

module.exports = GoogleProvider;