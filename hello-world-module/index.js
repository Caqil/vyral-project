class HelloWorldModule {
  constructor(config = {}) {
    this.config = config;
    this.name = 'hello-world';
    this.requestCount = 0;
  }

  async initialize() {
    console.log('🌟 Hello World Module initializing...');
    
    // Log current configuration
    if (this.config.enable_logging) {
      console.log('📋 Hello World Module config:', {
        greeting: this.config.greeting_message,
        format: this.config.response_format,
        logging: this.config.enable_logging
      });
    }

    console.log('✅ Hello World Module initialized successfully!');
  }

  async cleanup() {
    console.log('🧹 Hello World Module cleanup...');
    console.log(`📊 Total requests handled: ${this.requestCount}`);
    console.log('👋 Hello World Module deactivated');
  }

  async updateConfig(newConfig) {
    console.log('🔄 Hello World Module config updated:', newConfig);
    this.config = { ...this.config, ...newConfig };
  }

  // API Route Handlers
  async getHello(req, res) {
    try {
      this.requestCount++;
      
      if (this.config.enable_logging) {
        console.log(`📞 Hello API called (request #${this.requestCount})`);
      }

      const message = this.config.greeting_message || 'Hello, World!';
      const format = this.config.response_format || 'json';

      const data = {
        message,
        timestamp: new Date().toISOString(),
        requestCount: this.requestCount,
        module: 'hello-world',
        version: '1.0.0'
      };

      switch (format) {
        case 'text':
          res.setHeader('Content-Type', 'text/plain');
          res.send(`${message} (Request #${this.requestCount})`);
          break;
          
        case 'html':
          res.setHeader('Content-Type', 'text/html');
          res.send(`
            <html>
              <head><title>Hello World Module</title></head>
              <body>
                <h1>🌟 ${message}</h1>
                <p>Request #${this.requestCount}</p>
                <p>Timestamp: ${data.timestamp}</p>
                <p>Module: ${data.module} v${data.version}</p>
              </body>
            </html>
          `);
          break;
          
        default: // json
          res.json({
            success: true,
            data
          });
      }
    } catch (error) {
      console.error('❌ Hello API error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async postHello(req, res) {
    try {
      this.requestCount++;
      
      const { name, customMessage } = req.body;
      
      if (this.config.enable_logging) {
        console.log(`📞 Custom Hello API called (request #${this.requestCount})`, { name, customMessage });
      }

      let message;
      if (customMessage) {
        message = customMessage;
      } else if (name) {
        message = `Hello, ${name}!`;
      } else {
        message = this.config.greeting_message || 'Hello, World!';
      }

      const data = {
        message,
        name: name || 'Anonymous',
        timestamp: new Date().toISOString(),
        requestCount: this.requestCount,
        module: 'hello-world'
      };

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('❌ Custom Hello API error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Event Hook Handlers
  async onTestEvent(eventData) {
    if (this.config.enable_logging) {
      console.log('🎯 Hello World Module received test event:', eventData);
    }
    
    return {
      module: 'hello-world',
      message: 'Test event received successfully!',
      timestamp: new Date().toISOString()
    };
  }

  // Utility methods
  getStats() {
    return {
      requestCount: this.requestCount,
      config: this.config,
      status: 'active'
    };
  }
}

module.exports = HelloWorldModule;