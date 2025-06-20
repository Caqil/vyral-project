/**
 * Provider Configuration Component
 * Admin interface for configuring OAuth providers
 */

class ProviderConfig {
  constructor(provider, config = {}) {
    this.provider = provider;
    this.config = config;
    this.element = null;
  }

  render(container) {
    this.element = this.createElement();
    
    if (typeof container === 'string') {
      const element = document.querySelector(container);
      if (element) {
        element.appendChild(this.element);
      }
    } else if (container && container.appendChild) {
      container.appendChild(this.element);
    }

    return this.element;
  }

  createElement() {
    const wrapper = document.createElement('div');
    wrapper.className = 'provider-config bg-white border border-gray-200 rounded-lg p-6 mb-4';
    wrapper.innerHTML = this.getTemplate();
    
    // Attach event listeners
    this.attachEventListeners(wrapper);
    
    return wrapper;
  }

  getTemplate() {
    const isEnabled = this.config.enabled_providers?.includes(this.provider.slug) || false;
    const configKey = this.getConfigKey();
    
    return `
      <div class="provider-header flex items-center justify-between mb-4">
        <div class="flex items-center">
          <span class="provider-icon text-2xl mr-3">${this.provider.icon}</span>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">${this.provider.name}</h3>
            <p class="text-sm text-gray-500">${this.provider.description}</p>
          </div>
        </div>
        <div class="flex items-center">
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" class="sr-only peer" 
                   data-provider="${this.provider.slug}" 
                   ${isEnabled ? 'checked' : ''}>
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
      
      <div class="provider-config-fields ${isEnabled ? '' : 'hidden'}">
        ${this.getConfigFields()}
      </div>
      
      <div class="provider-status mt-4">
        ${this.getStatusSection()}
      </div>
    `;
  }

  getConfigFields() {
    const fields = this.getProviderFields();
    
    return fields.map(field => `
      <div class="config-field mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          ${field.label}
          ${field.required ? '<span class="text-red-500">*</span>' : ''}
        </label>
        <input type="${field.type || 'text'}" 
               name="${field.key}"
               value="${this.config[field.key] || ''}"
               placeholder="${field.placeholder || ''}"
               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
               ${field.required ? 'required' : ''}>
        ${field.description ? `<p class="text-xs text-gray-500 mt-1">${field.description}</p>` : ''}
      </div>
    `).join('');
  }

  getProviderFields() {
    const fields = {
      google: [
        {
          key: 'google_client_id',
          label: 'Client ID',
          placeholder: 'Google OAuth 2.0 Client ID',
          required: true,
          description: 'From Google Cloud Console > APIs & Services > Credentials'
        },
        {
          key: 'google_client_secret',
          label: 'Client Secret',
          type: 'password',
          placeholder: 'Google OAuth 2.0 Client Secret',
          required: true,
          description: 'Keep this secret and never expose in frontend code'
        }
      ],
      github: [
        {
          key: 'github_client_id',
          label: 'Client ID',
          placeholder: 'GitHub OAuth App Client ID',
          required: true,
          description: 'From GitHub Settings > Developer settings > OAuth Apps'
        },
        {
          key: 'github_client_secret',
          label: 'Client Secret',
          type: 'password',
          placeholder: 'GitHub OAuth App Client Secret',
          required: true,
          description: 'Generate new client secret in GitHub OAuth App settings'
        }
      ],
      facebook: [
        {
          key: 'facebook_app_id',
          label: 'App ID',
          placeholder: 'Facebook App ID',
          required: true,
          description: 'From Facebook Developers > Your App > Settings > Basic'
        },
        {
          key: 'facebook_app_secret',
          label: 'App Secret',
          type: 'password',
          placeholder: 'Facebook App Secret',
          required: true,
          description: 'Click "Show" next to App Secret in Facebook app settings'
        }
      ],
      twitter: [
        {
          key: 'twitter_client_id',
          label: 'Client ID',
          placeholder: 'Twitter API Client ID',
          required: true,
          description: 'From Twitter Developer Portal > Your App > Keys and tokens'
        },
        {
          key: 'twitter_client_secret',
          label: 'Client Secret',
          type: 'password',
          placeholder: 'Twitter API Client Secret',
          required: true,
          description: 'OAuth 2.0 Client Secret from Twitter Developer Portal'
        }
      ],
      discord: [
        {
          key: 'discord_client_id',
          label: 'Client ID',
          placeholder: 'Discord Application Client ID',
          required: true,
          description: 'From Discord Developer Portal > Your Application > General Information'
        },
        {
          key: 'discord_client_secret',
          label: 'Client Secret',
          type: 'password',
          placeholder: 'Discord Application Client Secret',
          required: true,
          description: 'Click "Reset Secret" to generate new client secret'
        }
      ],
      linkedin: [
        {
          key: 'linkedin_client_id',
          label: 'Client ID',
          placeholder: 'LinkedIn App Client ID',
          required: true,
          description: 'From LinkedIn Developers > Your App > Auth'
        },
        {
          key: 'linkedin_client_secret',
          label: 'Client Secret',
          type: 'password',
          placeholder: 'LinkedIn App Client Secret',
          required: true,
          description: 'Primary Client Secret from LinkedIn app settings'
        }
      ]
    };

    return fields[this.provider.slug] || [];
  }

  getStatusSection() {
    const isConfigured = this.isProviderConfigured();
    const callbackUrl = `${window.location.origin}/api/oauth/callback/${this.provider.slug}`;
    
    return `
      <div class="status-section border-t pt-4">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium text-gray-700">Configuration Status</span>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isConfigured 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }">
            ${isConfigured ? '✓ Configured' : '✗ Not Configured'}
          </span>
        </div>
        
        <div class="callback-url mb-3">
          <label class="block text-sm font-medium text-gray-700 mb-1">Callback URL</label>
          <div class="flex">
            <input type="text" 
                   value="${callbackUrl}" 
                   readonly 
                   class="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-l-md text-sm">
            <button type="button" 
                    onclick="navigator.clipboard.writeText('${callbackUrl}')"
                    class="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md text-sm hover:bg-gray-200">
              Copy
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-1">Use this URL in your ${this.provider.name} OAuth app settings</p>
        </div>
        
        ${isConfigured ? this.getTestSection() : ''}
      </div>
    `;
  }

  getTestSection() {
    return `
      <div class="test-section">
        <button type="button" 
                class="test-provider-btn inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                data-provider="${this.provider.slug}">
          <span class="mr-2">🧪</span>
          Test ${this.provider.name} OAuth
        </button>
      </div>
    `;
  }

  isProviderConfigured() {
    const fields = this.getProviderFields();
    return fields.every(field => field.required ? this.config[field.key] : true);
  }

  getConfigKey() {
    return `${this.provider.slug}_config`;
  }

  attachEventListeners(wrapper) {
    // Provider enable/disable toggle
    const toggle = wrapper.querySelector(`input[data-provider="${this.provider.slug}"]`);
    if (toggle) {
      toggle.addEventListener('change', (e) => {
        const configFields = wrapper.querySelector('.provider-config-fields');
        if (e.target.checked) {
          configFields.classList.remove('hidden');
        } else {
          configFields.classList.add('hidden');
        }
        
        this.onProviderToggle(e.target.checked);
      });
    }

    // Configuration field changes
    const configInputs = wrapper.querySelectorAll('.config-field input');
    configInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        this.onConfigChange(e.target.name, e.target.value);
      });
    });

    // Test provider button
    const testBtn = wrapper.querySelector('.test-provider-btn');
    if (testBtn) {
      testBtn.addEventListener('click', () => {
        this.testProvider();
      });
    }
  }

  onProviderToggle(enabled) {
    console.log(`Provider ${this.provider.slug} ${enabled ? 'enabled' : 'disabled'}`);
    
    // Update enabled providers list
    let enabledProviders = this.config.enabled_providers || [];
    
    if (enabled && !enabledProviders.includes(this.provider.slug)) {
      enabledProviders.push(this.provider.slug);
    } else if (!enabled) {
      enabledProviders = enabledProviders.filter(p => p !== this.provider.slug);
    }
    
    this.config.enabled_providers = enabledProviders;
    this.saveConfig();
  }

  onConfigChange(key, value) {
    console.log(`Config changed: ${key} = ${value}`);
    this.config[key] = value;
    
    // Update status when config changes
    this.updateStatus();
    this.saveConfig();
  }

  updateStatus() {
    if (this.element) {
      const statusSection = this.element.querySelector('.status-section');
      if (statusSection) {
        statusSection.innerHTML = this.getStatusSection();
        
        // Reattach test button listener
        const testBtn = statusSection.querySelector('.test-provider-btn');
        if (testBtn) {
          testBtn.addEventListener('click', () => {
            this.testProvider();
          });
        }
      }
    }
  }

  async testProvider() {
    try {
      const testBtn = this.element.querySelector('.test-provider-btn');
      testBtn.disabled = true;
      testBtn.innerHTML = '<span class="mr-2">⏳</span>Testing...';
      
      // Test OAuth flow (just get auth URL)
      const response = await fetch(`/api/oauth/auth/${this.provider.slug}?test=true`);
      const data = await response.json();
      
      if (data.success) {
        this.showMessage('✅ OAuth configuration test successful!', 'success');
      } else {
        this.showMessage(`❌ OAuth test failed: ${data.error}`, 'error');
      }
    } catch (error) {
      this.showMessage(`❌ OAuth test error: ${error.message}`, 'error');
    } finally {
      const testBtn = this.element.querySelector('.test-provider-btn');
      testBtn.disabled = false;
      testBtn.innerHTML = `<span class="mr-2">🧪</span>Test ${this.provider.name} OAuth`;
    }
  }

  showMessage(message, type = 'info') {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message mt-2 p-3 rounded-md text-sm ${
      type === 'success' ? 'bg-green-100 text-green-700' :
      type === 'error' ? 'bg-red-100 text-red-700' :
      'bg-blue-100 text-blue-700'
    }`;
    messageDiv.textContent = message;
    
    // Add to status section
    const statusSection = this.element.querySelector('.status-section');
    if (statusSection) {
      // Remove existing messages
      const existingMessages = statusSection.querySelectorAll('.message');
      existingMessages.forEach(msg => msg.remove());
      
      statusSection.appendChild(messageDiv);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.parentNode.removeChild(messageDiv);
        }
      }, 5000);
    }
  }

  async saveConfig() {
    try {
      // Save configuration to backend
      const response = await fetch('/api/admin/oauth/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.config)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }
      
      console.log('OAuth configuration saved successfully');
    } catch (error) {
      console.error('Failed to save OAuth configuration:', error);
      this.showMessage('Failed to save configuration', 'error');
    }
  }

  // Static method to create provider config for all providers
  static async createAll(container) {
    try {
      // Get available providers
      const response = await fetch('/api/oauth/providers/all');
      const data = await response.json();
      
      if (data.success) {
        const configs = [];
        
        for (const provider of data.data.providers) {
          const config = new ProviderConfig(provider, data.data.config);
          config.render(container);
          configs.push(config);
        }
        
        return configs;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to create provider configs:', error);
      throw error;
    }
  }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProviderConfig;
} else if (typeof window !== 'undefined') {
  window.ProviderConfig = ProviderConfig;
}