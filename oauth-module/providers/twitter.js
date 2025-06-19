const axios = require('axios');
const querystring = require('querystring');
const crypto = require('crypto');

class TwitterProvider {
  constructor(config) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.authUrl = 'https://twitter.com/i/oauth2/authorize';
    this.tokenUrl = 'https://api.twitter.com/2/oauth2/token';
    this.profileUrl = 'https://api.twitter.com/2/users/me';
    this.scopes = ['tweet.read', 'users.read', 'offline.access'];
  }

  getAuthorizationUrl(options = {}) {
    const codeChallenge = this.generateCodeChallenge();
    const params = {
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: options.redirect_uri,
      scope: options.scope || this.scopes.join(' '),
      state: options.state,
      code_challenge: codeChallenge.challenge,
      code_challenge_method: 'S256'
    };

    // Store code verifier for later use (in production, store this securely)
    this.codeVerifier = codeChallenge.verifier;

    const queryStr = querystring.stringify(params);
    return `${this.authUrl}?${queryStr}`;
  }

  async exchangeCodeForToken(code, options = {}) {
    try {
      const data = {
        code: code,
        grant_type: 'authorization_code',
        client_id: this.clientId,
        redirect_uri: options.redirect_uri,
        code_verifier: this.codeVerifier || options.code_verifier
      };

      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await axios.post(this.tokenUrl, querystring.stringify(data), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Twitter token exchange failed: ${error.message}`);
    }
  }

  async getUserProfile(accessToken) {
    try {
      const response = await axios.get(this.profileUrl, {
        params: {
          'user.fields': 'id,name,username,email,profile_image_url,verified'
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const profile = response.data.data;
      return {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        username: profile.username,
        avatar: profile.profile_image_url,
        verified: profile.verified,
        provider: 'twitter',
        raw: profile
      };
    } catch (error) {
      throw new Error(`Twitter profile fetch failed: ${error.message}`);
    }
  }

  async refreshToken(refreshToken) {
    try {
      const data = {
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        client_id: this.clientId
      };

      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await axios.post(this.tokenUrl, querystring.stringify(data), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Twitter token refresh failed: ${error.message}`);
    }
  }

  async revokeToken(token) {
    try {
      const data = {
        token: token,
        client_id: this.clientId
      };

      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      await axios.post('https://api.twitter.com/2/oauth2/revoke', querystring.stringify(data), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      });
      return true;
    } catch (error) {
      console.error('Twitter token revocation failed:', error.message);
      return false;
    }
  }

  generateCodeChallenge() {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    return {
      verifier: verifier,
      challenge: challenge
    };
  }

  getConfig() {
    return {
      name: 'Twitter',
      clientId: this.clientId,
      scopes: this.scopes,
      authUrl: this.authUrl,
      tokenUrl: this.tokenUrl,
      profileUrl: this.profileUrl
    };
  }
}

module.exports = TwitterProvider;