const axios = require('axios');
const querystring = require('querystring');

class GitHubProvider {
  constructor(config) {
    this.config = config;
    this.authUrl = 'https://github.com/login/oauth/authorize';
    this.tokenUrl = 'https://github.com/login/oauth/access_token';
    this.userInfoUrl = 'https://api.github.com/user';
    this.userEmailsUrl = 'https://api.github.com/user/emails';
  }

  getAuthorizationUrl(options = {}) {
    const params = {
      client_id: this.config.clientId,
      redirect_uri: options.redirect_uri || `${process.env.NEXTAUTH_URL}/api/oauth/callback/github`,
      scope: 'user:email',
      state: options.state
    };

    return `${this.authUrl}?${querystring.stringify(params)}`;
  }

  async exchangeCodeForToken(code, options = {}) {
    try {
      const response = await axios.post(this.tokenUrl, {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: options.redirect_uri || `${process.env.NEXTAUTH_URL}/api/oauth/callback/github`
      }, {
        headers: {
          Accept: 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`GitHub token exchange failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  async getUserProfile(accessToken) {
    try {
      // Get user profile
      const userResponse = await axios.get(this.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'Vyral-CMS-OAuth'
        }
      });

      // Get user emails
      const emailResponse = await axios.get(this.userEmailsUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'Vyral-CMS-OAuth'
        }
      });

      const profile = userResponse.data;
      const emails = emailResponse.data;
      const primaryEmail = emails.find(email => email.primary) || emails[0];

      return {
        id: profile.id.toString(),
        email: primaryEmail?.email || profile.email,
        name: profile.name || profile.login,
        username: profile.login,
        avatar: profile.avatar_url,
        bio: profile.bio,
        location: profile.location,
        website: profile.blog,
        provider: 'github'
      };
    } catch (error) {
      throw new Error(`GitHub profile fetch failed: ${error.message}`);
    }
  }

  getConfig() {
    return {
      name: 'GitHub',
      slug: 'github',
      scopes: ['user:email'],
      supportsRefresh: false
    };
  }
}

module.exports = GitHubProvider;