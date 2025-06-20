const axios = require('axios');
const querystring = require('querystring');

class DiscordProvider {
  constructor(config) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.authUrl = 'https://discord.com/oauth2/authorize';
    this.tokenUrl = 'https://discord.com/api/oauth2/token';
    this.profileUrl = 'https://discord.com/api/users/@me';
    this.scopes = ['identify', 'email'];
  }

  getAuthorizationUrl(options = {}) {
    const params = {
      client_id: this.clientId,
      response_type: 'code',
      scope: options.scope || this.scopes.join(' '),
      redirect_uri: options.redirect_uri,
      state: options.state,
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
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: options.redirect_uri
      };

      const response = await axios.post(this.tokenUrl, querystring.stringify(data), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Discord token exchange failed: ${error.message}`);
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
        name: profile.global_name || profile.username,
        username: profile.username,
        discriminator: profile.discriminator,
        avatar: profile.avatar ? 
          `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : 
          null,
        verified: profile.verified,
        provider: 'discord',
        raw: profile
      };
    } catch (error) {
      throw new Error(`Discord profile fetch failed: ${error.message}`);
    }
  }

  async refreshToken(refreshToken) {
    try {
      const data = {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      };

      const response = await axios.post(this.tokenUrl, querystring.stringify(data), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Discord token refresh failed: ${error.message}`);
    }
  }

  async revokeToken(token) {
    try {
      const data = {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        token: token
      };

      await axios.post('https://discord.com/api/oauth2/token/revoke', querystring.stringify(data), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      return true;
    } catch (error) {
      console.error('Discord token revocation failed:', error.message);
      return false;
    }
  }

  getConfig() {
    return {
      name: 'Discord',
      clientId: this.clientId,
      scopes: this.scopes,
      authUrl: this.authUrl,
      tokenUrl: this.tokenUrl,
      profileUrl: this.profileUrl
    };
  }
}

module.exports = DiscordProvider;