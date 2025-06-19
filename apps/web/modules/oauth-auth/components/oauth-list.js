/**
 * OAuth List Component
 * Renders a list of available OAuth provider buttons
 */

class OAuthList {
  constructor(options = {}) {
    this.options = {
      layout: 'vertical', // vertical, horizontal, grid
      buttonSize: 'medium',
      buttonStyle: 'default',
      showTitle: true,
      title: 'Sign in with',
      providers: [], // empty means all enabled providers
      onSuccess: null,
      onError: null,
      ...options
    };
    
    this.providers = [];
    this.buttons = [];
  }

  async initialize() {
    try {
      await this.loadProviders();
      return this;
    } catch (error) {
      console.error('Failed to initialize OAuth list:', error);
      throw error;
    }
  }

  async loadProviders() {
    try {
      const response = await fetch('/api/oauth/providers');
      const data = await response.json();
      
      if (data.success) {
        // Filter providers if specific ones requested
        this.providers = this.options.providers.length > 0
          ? data.data.providers.filter(p => this.options.providers.includes(p.slug))
          : data.data.providers;
          
        // Sort providers alphabetically
        this.providers.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to load OAuth providers:', error);
      throw error;
    }
  }

  render(container) {
    const wrapper = this.createWrapper();
    
    if (typeof container === 'string') {
      const element = document.querySelector(container);
      if (element) {
        element.appendChild(wrapper);
      }
    } else if (container && container.appendChild) {
      container.appendChild(wrapper);
    }

    return wrapper;
  }

  createWrapper() {
    const wrapper = document.createElement('div');
    wrapper.className = 'oauth-list';
    
    // Add title if enabled
    if (this.options.showTitle) {
      const title = document.createElement('h3');
      title.className = 'oauth-list-title text-lg font-semibold mb-4 text-gray-700';
      title.textContent = this.options.title;
      wrapper.appendChild(title);
    }

    // Create buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = this.getContainerClasses();
    
    // Create buttons for each provider
    this.providers.forEach(provider => {
      const button = new OAuthButton(provider, {
        size: this.options.buttonSize,
        style: this.options.buttonStyle,
        redirectUri: this.options.redirectUri,
        state: this.options.state
      });
      
      const buttonElement = button.createButton();
      
      // Add custom click handler if provided
      if (this.options.onSuccess || this.options.onError) {
        this.wrapButtonHandler(buttonElement, provider);
      }
      
      buttonsContainer.appendChild(buttonElement);
      this.buttons.push({ provider, button, element: buttonElement });
    });

    wrapper.appendChild(buttonsContainer);
    
    // Add no providers message if empty
    if (this.providers.length === 0) {
      const message = document.createElement('p');
      message.className = 'oauth-no-providers text-gray-500 text-center py-4';
      message.textContent = 'No OAuth providers are currently enabled.';
      wrapper.appendChild(message);
    }

    return wrapper;
  }

  getContainerClasses() {
    const baseClasses = 'oauth-buttons-container';
    
    switch (this.options.layout) {
      case 'horizontal':
        return `${baseClasses} flex flex-wrap gap-3`;
      case 'grid':
        return `${baseClasses} grid grid-cols-2 gap-3`;
      default: // vertical
        return `${baseClasses} flex flex-col gap-3`;
    }
  }

  wrapButtonHandler(buttonElement, provider) {
    const originalHandler = buttonElement.onclick;
    
    buttonElement.onclick = async (event) => {
      try {
        // Call original handler
        await originalHandler.call(buttonElement, event);
        
        // Call success callback if provided
        if (this.options.onSuccess) {
          this.options.onSuccess(provider);
        }
      } catch (error) {
        // Call error callback if provided
        if (this.options.onError) {
          this.options.onError(error, provider);
        } else {
          // Re-throw if no error handler
          throw error;
        }
      }
    };
  }

  // Method to refresh providers list
  async refresh() {
    await this.loadProviders();
    
    // If already rendered, update the display
    const existingWrapper = document.querySelector('.oauth-list');
    if (existingWrapper && existingWrapper.parentNode) {
      const newWrapper = this.createWrapper();
      existingWrapper.parentNode.replaceChild(newWrapper, existingWrapper);
    }
  }

  // Method to enable/disable specific providers
  setEnabledProviders(providerSlugs) {
    this.options.providers = providerSlugs;
    return this.refresh();
  }

  // Method to update button styling
  updateButtonStyle(style) {
    this.options.buttonStyle = style;
    this.buttons.forEach(({ button, element }) => {
      element.innerHTML = button.getButtonContent();
      element.className = button.getButtonClasses();
    });
  }

  // Static factory method
  static async create(options = {}) {
    const list = new OAuthList(options);
    await list.initialize();
    return list;
  }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OAuthList;
} else if (typeof window !== 'undefined') {
  window.OAuthList = OAuthList;
}