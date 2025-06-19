const axios = require('axios');
const querystring = require('querystring');

class DiscordProvider {
  constructor(config) {
    this.config = config;
    this.authUrl = 'https://discord.com/api/oauth2/authorize';
    this.tokenUrl = 'https://discord.com/api/oauth2/token';
    this.userInfoUrl = 'https://discord.com/api/users/@me';
  }

  getAuthorizationUrl(options = {}) {
    const params = {
      client_id: this.config.clientId,
      redirect_uri: options.redirect_uri || `${process.env.NEXTAUTH_URL}/api/oauth/callback/discord`,
      response_type: 'code',
      scope: 'identify email',
      state: options.state
    };

    return `${this.authUrl}?${querystring.stringify(params)}`;
  }

  async exchangeCodeForToken(code, options = {}) {
    try {
      const response = await axios.post(this.tokenUrl, querystring.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: options.redirect_uri || `${process.env.NEXTAUTH_URL}/api/oauth/callback/discord`
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Discord token exchange failed: ${error.response?.data?.error_description || error.message}`);
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
        name: profile.global_name || profile.username,
        username: profile.username,
        discriminator: profile.discriminator,
        avatar: profile.avatar ? 
          `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : 
          null,
        verified: profile.verified,
        mfaEnabled: profile.mfa_enabled,
        provider: 'discord'
      };
    } catch (error) {
      throw new Error(`Discord profile fetch failed: ${error.message}`);
    }
  }

  async refreshToken(refreshToken) {
    try {
      const response = await axios.post(this.tokenUrl, querystring.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Discord token refresh failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  getConfig() {
    return {
      name: 'Discord',
      slug: 'discord',
      scopes: ['identify', 'email'],
      supportsRefresh: true
    };
  }
}

module.exports = DiscordProvider;