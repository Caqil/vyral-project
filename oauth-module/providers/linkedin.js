const axios = require('axios');
const querystring = require('querystring');

class LinkedInProvider {
  constructor(config) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.authUrl = 'https://www.linkedin.com/oauth/v2/authorization';
    this.tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
    this.profileUrl = 'https://api.linkedin.com/v2/people/~';
    this.emailUrl = 'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))';
    this.scopes = ['r_liteprofile', 'r_emailaddress'];
  }

  getAuthorizationUrl(options = {}) {
    const params = {
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: options.redirect_uri,
      state: options.state,
      scope: options.scope || this.scopes.join(' ')
    };

    const queryStr = querystring.stringify(params);
    return `${this.authUrl}?${queryStr}`;
  }

  async exchangeCodeForToken(code, options = {}) {
    try {
      const data = {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: options.redirect_uri,
        client_id: this.clientId,
        client_secret: this.clientSecret
      };

      const response = await axios.post(this.tokenUrl, querystring.stringify(data), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`LinkedIn token exchange failed: ${error.message}`);
    }
  }

  async getUserProfile(accessToken) {
    try {
      // Get profile information
      const profileResponse = await axios.get(this.profileUrl, {
        params: {
          projection: '(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))'
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      // Get email address
      let email = null;
      try {
        const emailResponse = await axios.get(this.emailUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        const emailData = emailResponse.data;
        email = emailData.elements?.[0]?.['handle~']?.emailAddress;
      } catch (emailError) {
        console.warn('Failed to fetch LinkedIn email:', emailError.message);
      }

      const profile = profileResponse.data;
      const profilePicture = profile.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier;

      return {
        id: profile.id,
        email: email,
        name: `${profile.localizedFirstName} ${profile.localizedLastName}`.trim(),
        firstName: profile.localizedFirstName,
        lastName: profile.localizedLastName,
        avatar: profilePicture,
        provider: 'linkedin',
        raw: profile
      };
    } catch (error) {
      throw new Error(`LinkedIn profile fetch failed: ${error.message}`);
    }
  }

  async refreshToken(refreshToken) {
    try {
      const data = {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      };

      const response = await axios.post(this.tokenUrl, querystring.stringify(data), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`LinkedIn token refresh failed: ${error.message}`);
    }
  }

  async revokeToken(token) {
    // LinkedIn doesn't provide a direct revocation endpoint
    // The token will expire naturally or can be revoked through LinkedIn's app settings
    console.warn('LinkedIn does not provide a direct token revocation endpoint');
    return false;
  }

  getConfig() {
    return {
      name: 'LinkedIn',
      clientId: this.clientId,
      scopes: this.scopes,
      authUrl: this.authUrl,
      tokenUrl: this.tokenUrl,
      profileUrl: this.profileUrl
    };
  }
}

module.exports = LinkedInProvider;