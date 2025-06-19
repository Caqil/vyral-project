const axios = require('axios');
const querystring = require('querystring');

class GitHubProvider {
  constructor(config) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.authUrl = 'https://github.com/login/oauth/authorize';
    this.tokenUrl = 'https://github.com/login/oauth/access_token';
    this.profileUrl = 'https://api.github.com/user';
    this.emailUrl = 'https://api.github.com/user/emails';
    this.scopes = ['user:email'];
  }

  getAuthorizationUrl(options = {}) {
    const params = {
      client_id: this.clientId,
      scope: options.scope || this.scopes.join(' '),
      redirect_uri: options.redirect_uri,
      state: options.state,
      allow_signup: true
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
        redirect_uri: options.redirect_uri
      };

      const response = await axios.post(this.tokenUrl, data, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`GitHub token exchange failed: ${error.message}`);
    }
  }

  async getUserProfile(accessToken) {
    try {
      // Get user profile
      const profileResponse = await axios.get(this.profileUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'VyralCMS-OAuth'
        }
      });

      // Get user emails
      let primaryEmail = null;
      try {
        const emailResponse = await axios.get(this.emailUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'VyralCMS-OAuth'
          }
        });
        
        const emails = emailResponse.data;
        primaryEmail = emails.find(email => email.primary)?.email || emails[0]?.email;
      } catch (emailError) {
        console.warn('Failed to fetch GitHub emails:', emailError.message);
      }

      const profile = profileResponse.data;
      return {
        id: profile.id.toString(),
        email: primaryEmail || profile.email,
        name: profile.name || profile.login,
        firstName: profile.name ? profile.name.split(' ')[0] : profile.login,
        lastName: profile.name ? profile.name.split(' ').slice(1).join(' ') : '',
        avatar: profile.avatar_url,
        username: profile.login,
        provider: 'github',
        raw: profile
      };
    } catch (error) {
      throw new Error(`GitHub profile fetch failed: ${error.message}`);
    }
  }

  async refreshToken(refreshToken) {
    // GitHub doesn't support refresh tokens in OAuth 2.0 flow
    throw new Error('GitHub does not support token refresh');
  }

  async revokeToken(token) {
    try {
      await axios.delete(`https://api.github.com/applications/${this.clientId}/token`, {
        auth: {
          username: this.clientId,
          password: this.clientSecret
        },
        data: {
          access_token: token
        }
      });
      return true;
    } catch (error) {
      console.error('GitHub token revocation failed:', error.message);
      return false;
    }
  }

  getConfig() {
    return {
      name: 'GitHub',
      clientId: this.clientId,
      scopes: this.scopes,
      authUrl: this.authUrl,
      tokenUrl: this.tokenUrl,
      profileUrl: this.profileUrl
    };
  }
}

module.exports = GitHubProvider;