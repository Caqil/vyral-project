// plugins/oauth2-plugin/src/providers/github.ts
import { OAuthConfig, OAuthProvider, OAuthTokens, OAuthUser } from "../types/oauth";

export class GitHubProvider implements OAuthProvider {
  public name = "github";
  private config: OAuthConfig;

  constructor(config: OAuthConfig) {
    this.config = {
      ...config,
      scope: config.scope || ["user:email", "read:user"]
    };
  }

  async getAuthorizationUrl(state?: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: this.config.scope!.join(" "),
      state: state || "",
      allow_signup: "true"
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokens> {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub token exchange failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
    }

    return {
      access_token: data.access_token,
      token_type: data.token_type || "bearer",
      refresh_token: data.refresh_token,
      expires_in: data.expires_in
    };
  }

  async getUserInfo(accessToken: string): Promise<OAuthUser> {
    // Get user profile
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "OAuth-App",
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      throw new Error(`GitHub user info request failed: ${userResponse.status} ${errorText}`);
    }

    const userData = await userResponse.json();

    // Get user emails (GitHub might not return email in user profile if private)
    let primaryEmail = userData.email;
    let emailVerified = false;

    if (!primaryEmail) {
      try {
        const emailsResponse = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "OAuth-App",
            Accept: "application/vnd.github.v3+json",
          },
        });

        if (emailsResponse.ok) {
          const emailsData = await emailsResponse.json();
          const primaryEmailObj = emailsData.find((email: any) => email.primary) || emailsData[0];
          
          if (primaryEmailObj) {
            primaryEmail = primaryEmailObj.email;
            emailVerified = primaryEmailObj.verified;
          }
        }
      } catch (emailError) {
        console.warn("Failed to fetch GitHub user emails:", emailError);
      }
    } else {
      // If email is public, assume it's verified
      emailVerified = true;
    }

    if (!primaryEmail) {
      throw new Error("No email address found for GitHub user. Please make sure your email is public or grant email access.");
    }

    return {
      id: userData.id.toString(),
      email: primaryEmail,
      name: userData.name || userData.login,
      avatar: userData.avatar_url,
      verified: emailVerified,
      // Additional GitHub-specific data
      username: userData.login,
      profile_url: userData.html_url,
      company: userData.company,
      location: userData.location,
      bio: userData.bio,
      public_repos: userData.public_repos,
      followers: userData.followers,
      following: userData.following
    };
  }

  // GitHub-specific helper methods

  /**
   * Get user's repositories
   */
  async getUserRepositories(accessToken: string, options: {
    type?: 'all' | 'owner' | 'public' | 'private' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<any[]> {
    const params = new URLSearchParams({
      type: options.type || 'owner',
      sort: options.sort || 'updated',
      direction: options.direction || 'desc',
      per_page: (options.per_page || 30).toString(),
      page: (options.page || 1).toString()
    });

    const response = await fetch(`https://api.github.com/user/repos?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "OAuth-App",
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub repositories: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get user's organizations
   */
  async getUserOrganizations(accessToken: string): Promise<any[]> {
    const response = await fetch("https://api.github.com/user/orgs", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "OAuth-App",
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub organizations: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check if user has specific permissions on a repository
   */
  async checkRepositoryPermission(
    accessToken: string, 
    owner: string, 
    repo: string
  ): Promise<{ permission: string; admin: boolean; maintain: boolean; push: boolean; triage: boolean; pull: boolean }> {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/collaborators/permission`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "OAuth-App",
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to check GitHub repository permission: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Validate GitHub OAuth token
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "OAuth-App",
          Accept: "application/vnd.github.v3+json",
        },
      });

      return response.ok;
    } catch (error) {
      console.error("GitHub token validation failed:", error);
      return false;
    }
  }

  /**
   * Get rate limit information
   */
  async getRateLimit(accessToken: string): Promise<{
    limit: number;
    remaining: number;
    reset: number;
    used: number;
  }> {
    const response = await fetch("https://api.github.com/rate_limit", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "OAuth-App",
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub rate limit: ${response.statusText}`);
    }

    const data = await response.json();
    return data.rate;
  }

  /**
   * Search for users (requires specific scope)
   */
  async searchUsers(accessToken: string, query: string, options: {
    sort?: 'followers' | 'repositories' | 'joined';
    order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<{ total_count: number; incomplete_results: boolean; items: any[] }> {
    const params = new URLSearchParams({
      q: query,
      sort: options.sort || 'followers',
      order: options.order || 'desc',
      per_page: (options.per_page || 30).toString(),
      page: (options.page || 1).toString()
    });

    const response = await fetch(`https://api.github.com/search/users?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "OAuth-App",
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to search GitHub users: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get user's public events
   */
  async getUserEvents(accessToken: string, username?: string): Promise<any[]> {
    const endpoint = username 
      ? `https://api.github.com/users/${username}/events/public`
      : "https://api.github.com/user/events";

    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "OAuth-App",
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub events: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get GitHub scopes for the current token
   */
  async getTokenScopes(accessToken: string): Promise<string[]> {
    const response = await fetch("https://api.github.com/user", {
      method: "HEAD",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "OAuth-App",
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to check GitHub token scopes: ${response.statusText}`);
    }

    const scopes = response.headers.get("X-OAuth-Scopes");
    return scopes ? scopes.split(", ").map(scope => scope.trim()) : [];
  }
}

export default GitHubProvider;