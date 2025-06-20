/**
 * OAuth Module Validators
 * Validation functions for OAuth configuration and providers
 */

const SUPPORTED_PROVIDERS = ['google', 'github', 'facebook', 'twitter', 'discord', 'linkedin'];

const REQUIRED_PROVIDER_FIELDS = {
  google: ['google_client_id', 'google_client_secret'],
  github: ['github_client_id', 'github_client_secret'],
  facebook: ['facebook_app_id', 'facebook_app_secret'],
  twitter: ['twitter_client_id', 'twitter_client_secret'],
  discord: ['discord_client_id', 'discord_client_secret'],
  linkedin: ['linkedin_client_id', 'linkedin_client_secret']
};

/**
 * Validate OAuth module configuration
 * @param {Object} config - Configuration object
 * @returns {Array} Array of validation errors
 */
function validateConfig(config) {
  const errors = [];

  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object');
    return errors;
  }

  // Validate enabled_providers
  if (config.enabled_providers) {
    if (!Array.isArray(config.enabled_providers)) {
      errors.push('enabled_providers must be an array');
    } else {
      // Check each enabled provider is supported
      for (const provider of config.enabled_providers) {
        if (!SUPPORTED_PROVIDERS.includes(provider)) {
          errors.push(`Unsupported provider: ${provider}`);
        } else {
          // Check required fields for enabled providers
          const requiredFields = REQUIRED_PROVIDER_FIELDS[provider];
          for (const field of requiredFields) {
            if (!config[field] || config[field].trim() === '') {
              errors.push(`${field} is required when ${provider} provider is enabled`);
            }
          }
        }
      }
    }
  }

  // Validate session_duration
  if (config.session_duration !== undefined) {
    if (typeof config.session_duration !== 'number' || config.session_duration < 1 || config.session_duration > 168) {
      errors.push('session_duration must be a number between 1 and 168 hours');
    }
  }

  // Validate boolean fields
  const booleanFields = ['auto_create_users', 'allow_account_linking', 'require_email_verification'];
  for (const field of booleanFields) {
    if (config[field] !== undefined && typeof config[field] !== 'boolean') {
      errors.push(`${field} must be a boolean value`);
    }
  }

  return errors;
}

/**
 * Validate individual provider configuration
 * @param {string} provider - Provider name
 * @param {Object} config - Provider configuration
 * @returns {Array} Array of validation errors
 */
function validateProvider(provider, config) {
  const errors = [];

  if (!provider || typeof provider !== 'string') {
    errors.push('Provider name must be a string');
    return errors;
  }

  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    errors.push(`Unsupported provider: ${provider}`);
    return errors;
  }

  if (!config || typeof config !== 'object') {
    errors.push('Provider configuration must be an object');
    return errors;
  }

  const requiredFields = REQUIRED_PROVIDER_FIELDS[provider];
  for (const field of requiredFields) {
    if (!config[field] || config[field].trim() === '') {
      errors.push(`${field} is required for ${provider} provider`);
    }
  }

  // Provider-specific validations
  switch (provider) {
    case 'google':
      if (config.google_client_id && !config.google_client_id.includes('.googleusercontent.com')) {
        errors.push('Google Client ID should end with .googleusercontent.com');
      }
      break;

    case 'facebook':
      if (config.facebook_app_id && !/^\d+$/.test(config.facebook_app_id)) {
        errors.push('Facebook App ID should be numeric');
      }
      break;

    case 'twitter':
      if (config.twitter_client_id && config.twitter_client_id.length < 20) {
        errors.push('Twitter Client ID appears to be too short');
      }
      break;

    case 'discord':
      if (config.discord_client_id && !/^\d{17,19}$/.test(config.discord_client_id)) {
        errors.push('Discord Client ID should be 17-19 digits');
      }
      break;
  }

  return errors;
}

/**
 * Validate OAuth scopes for a provider
 * @param {string} provider - Provider name
 * @param {Array} scopes - Array of scopes
 * @returns {Array} Array of validation errors
 */
function validateScopes(provider, scopes) {
  const errors = [];

  if (!Array.isArray(scopes)) {
    errors.push('Scopes must be an array');
    return errors;
  }

  const validScopes = {
    google: ['openid', 'email', 'profile'],
    github: ['user', 'user:email', 'read:user'],
    facebook: ['email', 'public_profile'],
    twitter: ['tweet.read', 'users.read', 'offline.access'],
    discord: ['identify', 'email', 'guilds'],
    linkedin: ['r_liteprofile', 'r_emailaddress']
  };

  if (validScopes[provider]) {
    for (const scope of scopes) {
      if (!validScopes[provider].includes(scope)) {
        errors.push(`Invalid scope '${scope}' for ${provider} provider`);
      }
    }
  }

  return errors;
}

/**
 * Validate redirect URI format
 * @param {string} redirectUri - Redirect URI
 * @returns {Array} Array of validation errors
 */
function validateRedirectUri(redirectUri) {
  const errors = [];

  if (!redirectUri || typeof redirectUri !== 'string') {
    errors.push('Redirect URI must be a string');
    return errors;
  }

  try {
    const url = new URL(redirectUri);
    
    // Must be HTTPS in production (except localhost)
    if (url.protocol !== 'https:' && !url.hostname.includes('localhost')) {
      errors.push('Redirect URI must use HTTPS (except for localhost)');
    }

    // Should not contain fragments
    if (url.hash) {
      errors.push('Redirect URI should not contain URL fragments');
    }

  } catch (error) {
    errors.push('Redirect URI must be a valid URL');
  }

  return errors;
}

/**
 * Validate OAuth state parameter
 * @param {string} state - State parameter
 * @returns {Array} Array of validation errors
 */
function validateState(state) {
  const errors = [];

  if (!state || typeof state !== 'string') {
    errors.push('State parameter must be a string');
    return errors;
  }

  if (state.length < 16) {
    errors.push('State parameter should be at least 16 characters for security');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(state)) {
    errors.push('State parameter should only contain alphanumeric characters, hyphens, and underscores');
  }

  return errors;
}

module.exports = {
  validateConfig,
  validateProvider,
  validateScopes,
  validateRedirectUri,
  validateState,
  SUPPORTED_PROVIDERS,
  REQUIRED_PROVIDER_FIELDS
};