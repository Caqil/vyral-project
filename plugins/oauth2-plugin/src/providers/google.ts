import { OAuthConfig, OAuthProvider, OAuthTokens, OAuthUser } from "../types/oauth";

export class GoogleProvider implements OAuthProvider {
  public name = "google";
  private config: OAuthConfig;

  constructor(config: OAuthConfig) {
    this.config = {
      ...config,
      scope: config.scope || ["openid", "email", "profile"]
    };
  }

  async getAuthorizationUrl(state?: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: this.config.scope!.join(" "),
      state: state || "",
      access_type: "offline",
      prompt: "consent"
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokens> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Google token exchange failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getUserInfo(accessToken: string): Promise<OAuthUser> {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Google user info failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      avatar: data.picture,
      verified: data.verified_email,
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      throw new Error(`Google token refresh failed: ${response.statusText}`);
    }

    return response.json();
  }
}