// plugins/oauth2-plugin/src/providers/microsoft.ts
import { OAuthConfig, OAuthProvider, OAuthTokens, OAuthUser } from "../types/oauth";

export class MicrosoftProvider implements OAuthProvider {
  public name = "microsoft";
  private config: OAuthConfig;
  private tenant: string;

  constructor(config: OAuthConfig & { tenant?: string }) {
    this.config = {
      ...config,
      scope: config.scope || ["openid", "profile", "email", "User.Read"]
    };
    // Default to 'common' tenant to support both personal and work accounts
    this.tenant = config.tenant || "common";
  }

  async getAuthorizationUrl(state?: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: "code",
      redirect_uri: this.config.redirectUri,
      scope: this.config.scope!.join(" "),
      state: state || "",
      response_mode: "query",
      prompt: "select_account" // Allow user to choose account
    });

    return `https://login.microsoftonline.com/${this.tenant}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokens> {
    const response = await fetch(`https://login.microsoftonline.com/${this.tenant}/oauth2/v2.0/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
        grant_type: "authorization_code",
        scope: this.config.scope!.join(" ")
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error_description || errorData.error || response.statusText;
      throw new Error(`Microsoft token exchange failed: ${errorMessage}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Microsoft OAuth error: ${data.error_description || data.error}`);
    }

    return {
      access_token: data.access_token,
      token_type: data.token_type || "Bearer",
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      id_token: data.id_token,
      scope: data.scope
    };
  }

  async getUserInfo(accessToken: string): Promise<OAuthUser> {
    // Get user profile from Microsoft Graph API
    const response = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || response.statusText;
      throw new Error(`Microsoft user info request failed: ${errorMessage}`);
    }

    const userData = await response.json();

    // Get user photo if available
    let avatar: string | undefined;
    try {
      const photoResponse = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (photoResponse.ok) {
        // Convert blob to data URL
        const photoBlob = await photoResponse.blob();
        avatar = await this.blobToDataUrl(photoBlob);
      }
    } catch (photoError) {
      // Photo is optional, so we continue without it
      console.warn("Failed to fetch Microsoft user photo:", photoError);
    }

    return {
      id: userData.id,
      email: userData.mail || userData.userPrincipalName,
      name: userData.displayName,
      avatar,
      verified: true, // Microsoft accounts are considered verified
      // Additional Microsoft-specific data
      givenName: userData.givenName,
      surname: userData.surname,
      jobTitle: userData.jobTitle,
      companyName: userData.companyName,
      department: userData.department,
      officeLocation: userData.officeLocation,
      businessPhones: userData.businessPhones,
      mobilePhone: userData.mobilePhone,
      preferredLanguage: userData.preferredLanguage,
      userPrincipalName: userData.userPrincipalName,
      accountEnabled: userData.accountEnabled
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch(`https://login.microsoftonline.com/${this.tenant}/oauth2/v2.0/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: this.config.scope!.join(" ")
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error_description || errorData.error || response.statusText;
      throw new Error(`Microsoft token refresh failed: ${errorMessage}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Microsoft refresh error: ${data.error_description || data.error}`);
    }

    return {
      access_token: data.access_token,
      token_type: data.token_type || "Bearer",
      refresh_token: data.refresh_token || refreshToken, // Some responses may not include new refresh token
      expires_in: data.expires_in,
      id_token: data.id_token,
      scope: data.scope
    };
  }

  // Microsoft-specific helper methods

  /**
   * Get user's calendar events
   */
  async getCalendarEvents(accessToken: string, options: {
    startTime?: string;
    endTime?: string;
    top?: number;
    skip?: number;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    
    if (options.startTime && options.endTime) {
      params.append("startDateTime", options.startTime);
      params.append("endDateTime", options.endTime);
    }
    if (options.top) params.append("$top", options.top.toString());
    if (options.skip) params.append("$skip", options.skip.toString());

    const queryString = params.toString();
    const url = `https://graph.microsoft.com/v1.0/me/events${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Microsoft calendar events: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get user's email messages
   */
  async getMessages(accessToken: string, options: {
    folder?: string;
    top?: number;
    skip?: number;
    filter?: string;
    orderBy?: string;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    
    if (options.top) params.append("$top", options.top.toString());
    if (options.skip) params.append("$skip", options.skip.toString());
    if (options.filter) params.append("$filter", options.filter);
    if (options.orderBy) params.append("$orderby", options.orderBy);

    const queryString = params.toString();
    const folder = options.folder || "inbox";
    const url = `https://graph.microsoft.com/v1.0/me/mailFolders/${folder}/messages${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Microsoft messages: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get user's OneDrive files
   */
  async getOneDriveFiles(accessToken: string, path: string = "", options: {
    top?: number;
    skip?: number;
    orderBy?: string;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    
    if (options.top) params.append("$top", options.top.toString());
    if (options.skip) params.append("$skip", options.skip.toString());
    if (options.orderBy) params.append("$orderby", options.orderBy);

    const queryString = params.toString();
    const endpoint = path 
      ? `https://graph.microsoft.com/v1.0/me/drive/root:/${path}:/children`
      : "https://graph.microsoft.com/v1.0/me/drive/root/children";
    
    const url = `${endpoint}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch OneDrive files: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get user's groups/teams
   */
  async getUserGroups(accessToken: string): Promise<any> {
    const response = await fetch("https://graph.microsoft.com/v1.0/me/memberOf", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Microsoft user groups: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get user's manager
   */
  async getUserManager(accessToken: string): Promise<any> {
    const response = await fetch("https://graph.microsoft.com/v1.0/me/manager", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No manager found
      }
      throw new Error(`Failed to fetch Microsoft user manager: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get user's direct reports
   */
  async getUserDirectReports(accessToken: string): Promise<any> {
    const response = await fetch("https://graph.microsoft.com/v1.0/me/directReports", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Microsoft user direct reports: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Validate Microsoft OAuth token
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      return response.ok;
    } catch (error) {
      console.error("Microsoft token validation failed:", error);
      return false;
    }
  }

  /**
   * Get organization information
   */
  async getOrganization(accessToken: string): Promise<any> {
    const response = await fetch("https://graph.microsoft.com/v1.0/organization", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Microsoft organization info: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Search for users in the organization
   */
  async searchUsers(accessToken: string, query: string, options: {
    top?: number;
    skip?: number;
  } = {}): Promise<any> {
    const params = new URLSearchParams({
      $search: `"displayName:${query}" OR "mail:${query}" OR "userPrincipalName:${query}"`
    });
    
    if (options.top) params.append("$top", options.top.toString());
    if (options.skip) params.append("$skip", options.skip.toString());

    const response = await fetch(`https://graph.microsoft.com/v1.0/users?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        ConsistencyLevel: "eventual"
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to search Microsoft users: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Convert blob to data URL
   */
  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Decode JWT token (for ID token inspection)
   */
  private decodeJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Failed to decode JWT:", error);
      return null;
    }
  }

  /**
   * Get claims from ID token
   */
  getIdTokenClaims(idToken: string): any {
    return this.decodeJWT(idToken);
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(expiresIn: number, issuedAt: number = Date.now()): boolean {
    const expirationTime = issuedAt + (expiresIn * 1000);
    return Date.now() >= expirationTime;
  }
}

export default MicrosoftProvider;