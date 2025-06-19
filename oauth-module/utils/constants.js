/**
 * OAuth Module Constants
 * Centralized constants for OAuth providers and configuration
 */

// OAuth Provider Information
const OAUTH_PROVIDERS = {
  GOOGLE: {
    slug: 'google',
    name: 'Google',
    icon: '🔍',
    color: '#4285f4',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['openid', 'email', 'profile'],
    supportsRefresh: true
  },
  
  GITHUB: {
    slug: 'github',
    name: 'GitHub',
    icon: '🐙',
    color: '#333333',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    userEmailsUrl: 'https://api.github.com/user/emails',
    scopes: ['user:email'],
    supportsRefresh: false
  },
  
  FACEBOOK: {
    slug: 'facebook',
    name: 'Facebook',
    icon: '📘',
    color: '#1877f2',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    userInfoUrl: 'https://graph.facebook.com/v18.0/me',
    scopes: ['email', 'public_profile'],
    supportsRefresh: false
  },
  
  TWITTER: {
    slug: 'twitter',
    name: 'Twitter/X',
    icon: '🐦',
    color: '#1da1f2',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    userInfoUrl: 'https://api.twitter.com/2/users/me',
    revokeUrl: 'https://api.twitter.com/2/oauth2/revoke',
    scopes: ['tweet.read', 'users.read', 'offline.access'],
    supportsRefresh: true,
    usesPKCE: true
  },
  
  DISCORD: {
    slug: 'discord',
    name: 'Discord',
    icon: '🎮',
    color: '#5865f2',
    authUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userInfoUrl: 'https://discord.com/api/users/@me',
    scopes: ['identify', 'email'],
    supportsRefresh: true
  },
  
  LINKEDIN: {
    slug: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    color: '#0a66c2',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    userInfoUrl: 'https://api.linkedin.com/v2/userinfo',
    scopes: ['openid', 'profile', 'email'],
    supportsRefresh: true
  }
};

// OAuth Configuration
const OAUTH_CONFIG = {
  // Default session duration (24 hours)
  DEFAULT_SESSION_DURATION: 24 * 60 * 60 * 1000,
  
  // Token refresh threshold (refresh when less than 5 minutes remaining)
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000,
  
  // Maximum retry attempts for API calls
  MAX_RETRY_ATTEMPTS: 3,
  
  // Request timeout in milliseconds
  REQUEST_TIMEOUT: 30000,
  
  // Rate limiting
  RATE_LIMIT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  
  // Security
  STATE_LENGTH: 32,
  CODE_VERIFIER_LENGTH: 32,
  
  // Default scopes for each provider
  DEFAULT_SCOPES: {
    google: ['openid', 'email', 'profile'],
    github: ['user:email'],
    facebook: ['email', 'public_profile'],
    twitter: ['tweet.read', 'users.read'],
    discord: ['identify', 'email'],
    linkedin: ['openid', 'profile', 'email']
  }
};

// Error Messages
const ERROR_MESSAGES = {
  PROVIDER_NOT_FOUND: 'OAuth provider not found',
  PROVIDER_NOT_ENABLED: 'OAuth provider is not enabled',
  PROVIDER_NOT_CONFIGURED: 'OAuth provider is not properly configured',
  INVALID_AUTH_CODE: 'Invalid authorization code',
  TOKEN_EXCHANGE_FAILED: 'Failed to exchange authorization code for token',
  PROFILE_FETCH_FAILED: 'Failed to fetch user profile',
  TOKEN_REFRESH_FAILED: 'Failed to refresh access token',
  USER_NOT_FOUND: 'User not found',
  USER_CREATION_FAILED: 'Failed to create user account',
  ACCOUNT_LINKING_DISABLED: 'Account linking is disabled',
  EMAIL_VERIFICATION_REQUIRED: 'Email verification required',
  INVALID_STATE_PARAMETER: 'Invalid state parameter',
  CSRF_TOKEN_MISMATCH: 'CSRF token mismatch',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  INVALID_CONFIGURATION: 'Invalid OAuth configuration'
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Database Collections
const DB_COLLECTIONS = {
  OAUTH_PROVIDERS: 'oauth_providers',
  OAUTH_TOKENS: 'oauth_tokens',
  USERS: 'users',
  OAUTH_SESSIONS: 'oauth_sessions'
};

// Events
const OAUTH_EVENTS = {
  USER_AUTHENTICATED: 'oauth:user_authenticated',
  USER_CREATED: 'oauth:user_created',
  TOKEN_REFRESHED: 'oauth:token_refreshed',
  PROVIDER_CONNECTED: 'oauth:provider_connected',
  PROVIDER_DISCONNECTED: 'oauth:provider_disconnected',
  AUTH_FAILED: 'oauth:auth_failed',
  CONFIG_UPDATED: 'oauth:config_updated'
};

// Regular Expressions
const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,30}$/,
  OAUTH_CODE: /^[a-zA-Z0-9_-]+$/,
  STATE_PARAMETER: /^[a-zA-Z0-9_-]{32}$/,
  PROVIDER_SLUG: /^[a-z]+$/
};

// File Upload Limits
const UPLOAD_LIMITS = {
  AVATAR_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  AVATAR_ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  MAX_USERNAME_LENGTH: 30,
  MAX_BIO_LENGTH: 500
};

// Cache Keys
const CACHE_KEYS = {
  OAUTH_CONFIG: 'oauth:config',
  PROVIDER_CONFIG: (provider) => `oauth:provider:${provider}`,
  USER_TOKENS: (userId) => `oauth:tokens:${userId}`,
  AUTH_STATE: (state) => `oauth:state:${state}`,
  RATE_LIMIT: (ip) => `oauth:ratelimit:${ip}`
};

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
  CONFIG: 3600, // 1 hour
  TOKENS: 1800, // 30 minutes
  STATE: 600, // 10 minutes
  RATE_LIMIT: 900, // 15 minutes
  USER_PROFILE: 300 // 5 minutes
};

module.exports = {
  OAUTH_PROVIDERS,
  OAUTH_CONFIG,
  ERROR_MESSAGES,
  HTTP_STATUS,
  DB_COLLECTIONS,
  OAUTH_EVENTS,
  REGEX_PATTERNS,
  UPLOAD_LIMITS,
  CACHE_KEYS,
  CACHE_TTL
};