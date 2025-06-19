const axios = require('axios');
const querystring = require('querystring');
const crypto = require('crypto');

class TwitterProvider {
  constructor(config) {
    this.config = config;
    this.authUrl = 'https://twitter.com/i/oauth2/authorize';
    this.tokenUrl = 'https://api.twitter.com/2/oauth2/token';
    this.userInfoUrl = 'https://api.twitter.com/2/users/me';
    this.revokeUrl = 'https://api.twitter.com/2/oauth2/revoke';
  }

  getAuthorizationUrl(options = {}) {
    // Generate PKCE parameters
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    
    // Store code verifier for later use (you'd typically store this in session)
    options.codeVerifier = codeVerifier;

    const params = {
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: options.redirect_uri || `${process.env.NEXTAUTH_URL}/api/oauth/callback/twitter`,
      scope: 'tweet.read users.read offline.access',
      state: options.state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    };

    return `${this.authUrl}?${querystring.stringify(params)}`;
  }

  async exchangeCodeForToken(code, options = {}) {
    try {
      const response = await axios.post(this.tokenUrl, querystring.stringify({
        code,
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        redirect_uri: options.redirect_uri || `${process.env.NEXTAUTH_URL}/api/oauth/callback/twitter`,
        code_verifier: options.codeVerifier
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Twitter token exchange failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  async getUserProfile(accessToken) {
    try {
      const response = await axios.get(this.userInfoUrl, {
        params: {
          'user.fields': 'id,name,username,profile_image_url,description,location,verified'
        },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const profile = response.data.data;
      return {
        id: profile.id,
        name: profile.name,
        username: profile.username,
        avatar: profile.profile_image_url,
        bio: profile.description,
        location: profile.location,
        verified: profile.verified,
        provider: 'twitter'
      };
    } catch (error) {
      throw new Error(`Twitter profile fetch failed: ${error.message}`);
    }
  }

  async refreshToken(refreshToken) {
    try {
      const response = await axios.post(this.tokenUrl, querystring.stringify({
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        client_id: this.config.clientId
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Twitter token refresh failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  async revokeToken(token) {
    try {
      await axios.post(this.revokeUrl, querystring.stringify({
        token,
        client_id: this.config.clientId
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
        }
      });

      return true;
    } catch (error) {
      throw new Error(`Twitter token revocation failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
  }

  generateCodeChallenge(verifier) {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  getConfig() {
    return {
      name: 'Twitter/X',
      slug: 'twitter',
      scopes: ['tweet.read', 'users.read', 'offline.access'],
      supportsRefresh: true,
      usesPKCE: true
    };
  }
}

module.exports = TwitterProvider;