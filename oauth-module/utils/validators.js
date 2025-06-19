function validateConfig(config) {
  const errors = [];

  // Check if at least one provider is enabled
  if (!config.enabled_providers || config.enabled_providers.length === 0) {
    errors.push('At least one OAuth provider must be enabled');
  }

  // Validate provider configurations
  if (config.enabled_providers) {
    for (const provider of config.enabled_providers) {
      switch (provider) {
        case 'google':
          if (!config.google_client_id || !config.google_client_secret) {
            errors.push('Google OAuth requires client ID and client secret');
          }
          break;
        case 'github':
          if (!config.github_client_id || !config.github_client_secret) {
            errors.push('GitHub OAuth requires client ID and client secret');
          }
          break;
        case 'facebook':
          if (!config.facebook_app_id || !config.facebook_app_secret) {
            errors.push('Facebook OAuth requires app ID and app secret');
          }
          break;
        // Add validation for other providers...
      }
    }
  }

  // Validate session duration
  if (config.session_duration && (config.session_duration < 1 || config.session_duration > 168)) {
    errors.push('Session duration must be between 1 and 168 hours');
  }

  return errors;
}

function validateProvider(provider) {
  const validProviders = ['google', 'github', 'facebook', 'twitter', 'discord', 'linkedin'];
  return validProviders.includes(provider);
}

module.exports = {
  validateConfig,
  validateProvider
};