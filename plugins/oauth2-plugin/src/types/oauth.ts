export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope?: string[];
}

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

export interface OAuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  verified?: boolean;
}

export interface OAuthProvider {
  name: string;
  getAuthorizationUrl(state?: string): Promise<string>;
  exchangeCode(code: string): Promise<OAuthTokens>;
  getUserInfo(accessToken: string): Promise<OAuthUser>;
  refreshToken?(refreshToken: string): Promise<OAuthTokens>;
}