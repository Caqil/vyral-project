/**
 * OAuth Button Component
 * Renders individual OAuth provider login buttons
 */

class OAuthButton {
  constructor(provider, options = {}) {
    this.provider = provider;
    this.options = {
      size: 'medium', // small, medium, large
      style: 'default', // default, minimal, icon-only
      redirectUri: null,
      state: null,
      ...options
    };
  }

  render(container) {
    const button = this.createButton();
    
    if (typeof container === 'string') {
      const element = document.querySelector(container);
      if (element) {
        element.appendChild(button);
      }
    } else if (container && container.appendChild) {
      container.appendChild(button);
    }

    return button;
  }

  createButton() {
    const button = document.createElement('button');
    button.className = this.getButtonClasses();
    button.innerHTML = this.getButtonContent();
    button.onclick = () => this.handleClick();
    
    // Add provider-specific styling
    button.style.backgroundColor = this.provider.color || '#6b7280';
    button.style.borderColor = this.provider.color || '#6b7280';
    
    return button;
  }

  getButtonClasses() {
    const baseClasses = 'oauth-button inline-flex items-center justify-center font-medium rounded-md transition-colors';
    const sizeClasses = {
      small: 'px-3 py-2 text-sm',
      medium: 'px-4 py-2 text-base',
      large: 'px-6 py-3 text-lg'
    };
    
    return `${baseClasses} ${sizeClasses[this.options.size]} oauth-button-${this.provider.slug}`;
  }

  getButtonContent() {
    const icon = `<span class="oauth-icon mr-2">${this.provider.icon}</span>`;
    
    switch (this.options.style) {
      case 'icon-only':
        return `<span class="oauth-icon">${this.provider.icon}</span>`;
      case 'minimal':
        return `${icon}<span>Sign in</span>`;
      default:
        return `${icon}<span>Continue with ${this.provider.name}</span>`;
    }
  }

  async handleClick() {
    try {
      // Disable button during request
      const button = event.target.closest('.oauth-button');
      button.disabled = true;
      button.innerHTML = '<span class="oauth-spinner">⏳</span> Connecting...';

      // Get authorization URL from backend
      const response = await fetch(`/api/oauth/auth/${this.provider.slug}?${new URLSearchParams({
        redirect_uri: this.options.redirectUri || window.location.origin + '/auth/callback',
        state: this.options.state || this.generateState()
      })}`);

      const data = await response.json();

      if (data.success) {
        // Store state in sessionStorage for verification
        sessionStorage.setItem('oauth_state', data.data.state);
        sessionStorage.setItem('oauth_provider', this.provider.slug);
        
        // Redirect to OAuth provider
        window.location.href = data.data.authUrl;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('OAuth authentication error:', error);
      
      // Reset button
      const button = event.target.closest('.oauth-button');
      button.disabled = false;
      button.innerHTML = this.getButtonContent();
      
      // Show error message
      this.showError(error.message);
    }
  }

  generateState() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  showError(message) {
    // Create error toast or alert
    const errorDiv = document.createElement('div');
    errorDiv.className = 'oauth-error fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md z-50';
    errorDiv.textContent = `OAuth Error: ${message}`;
    
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 5000);
  }

  // Static method to create button with provider data
  static async create(providerSlug, options = {}) {
    try {
      // Fetch provider configuration
      const response = await fetch('/api/oauth/providers');
      const data = await response.json();
      
      if (data.success) {
        const provider = data.data.providers.find(p => p.slug === providerSlug);
        if (provider) {
          return new OAuthButton(provider, options);
        } else {
          throw new Error(`Provider ${providerSlug} not found`);
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to create OAuth button:', error);
      throw error;
    }
  }
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OAuthButton;
} else if (typeof window !== 'undefined') {
  window.OAuthButton = OAuthButton;
}