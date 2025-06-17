# @vyral/plugin-sdk

The official Plugin SDK for Vyral CMS - Build powerful, extensible plugins with TypeScript.

## 🚀 Features

- **Type-Safe Plugin Development** - Full TypeScript support with comprehensive type definitions
- **Hook System** - Extensible event system to modify core functionality
- **Component Framework** - React component registration for admin pages, widgets, and blocks
- **Route Management** - Easy API route registration with middleware support
- **Settings API** - Declarative plugin settings with validation
- **Storage & Caching** - Built-in plugin storage and caching utilities
- **Logging System** - Structured logging with multiple output handlers
- **Validation Utilities** - Zod-based validation schemas
- **Decorators** - Modern decorator-based plugin development
- **Hot Reloading** - Development-friendly plugin reloading

## 📦 Installation

```bash
npm install @vyral/plugin-sdk
```

## 🏗️ Quick Start

### 1. Create Plugin Structure

```
my-plugin/
├── package.json
├── plugin.config.json
├── src/
│   ├── index.ts
│   ├── components/
│   └── hooks/
└── README.md
```

### 2. Plugin Configuration

Create `plugin.config.json`:

```json
{
  "name": "my-awesome-plugin",
  "version": "1.0.0",
  "description": "An awesome plugin for Vyral CMS",
  "author": "Your Name",
  "vyralVersion": "^1.0.0",
  "hooks": ["content:before-render", "admin:menu"],
  "adminPages": [
    {
      "title": "My Plugin",
      "slug": "my-plugin",
      "component": "AdminPage",
      "icon": "Settings"
    }
  ],
  "settings": [
    {
      "key": "api_key",
      "label": "API Key",
      "type": "text",
      "required": true,
      "description": "Your API key for the service"
    },
    {
      "key": "enable_feature",
      "label": "Enable Feature",
      "type": "boolean",
      "default": true
    }
  ]
}
```

### 3. Basic Plugin Implementation

Create `src/index.ts`:

```typescript
import {
  BasePlugin,
  Hook,
  AdminPage,
  Setting,
  HookPriority,
} from "@vyral/plugin-sdk";
import { Post, HookContext } from "@vyral/plugin-sdk/types";

export default class MyAwesomePlugin extends BasePlugin {
  public config = {
    name: "my-awesome-plugin",
    version: "1.0.0",
    description: "An awesome plugin for Vyral CMS",
    author: "Your Name",
    vyralVersion: "^1.0.0",
  };

  @Setting("api_key", "API Key", { type: "text", required: true })
  private apiKey: string = "";

  @Setting("enable_feature", "Enable Feature", {
    type: "boolean",
    default: true,
  })
  private enableFeature: boolean = true;

  protected registerHooks(): void {
    this.registerHook(
      "content:before-render",
      this.enhanceContent.bind(this),
      HookPriority.NORMAL
    );
    this.registerHook("admin:menu", this.addAdminMenu.bind(this));
  }

  @Hook("content:before-render", HookPriority.NORMAL)
  private async enhanceContent(post: Post, context: HookContext) {
    if (!this.enableFeature)
      return { data: post, modified: false, stop: false };

    // Enhance the post content
    const enhancedPost = {
      ...post,
      content: post.content + "\n\n<!-- Enhanced by My Awesome Plugin -->",
    };

    return { data: enhancedPost, modified: true, stop: false };
  }

  @Hook("admin:menu")
  private async addAdminMenu(menu: any[], context: HookContext) {
    menu.push({
      title: "My Plugin",
      slug: "my-plugin",
      icon: "Settings",
      component: "AdminPage",
    });

    return { data: menu, modified: true, stop: false };
  }

  protected async onActivate(): Promise<void> {
    this.logger.info("My Awesome Plugin activated!");

    // Perform activation tasks
    const apiKey = await this.getSetting("api_key");
    if (!apiKey) {
      throw new Error("API key is required for this plugin");
    }

    // Initialize external services
    await this.initializeExternalService(apiKey);
  }

  protected async onDeactivate(): Promise<void> {
    this.logger.info("My Awesome Plugin deactivated!");

    // Cleanup tasks
    await this.cleanupExternalService();
  }

  private async initializeExternalService(apiKey: string): Promise<void> {
    // Initialize your external service
    this.logger.info("Initializing external service...");
  }

  private async cleanupExternalService(): Promise<void> {
    // Cleanup external service connections
    this.logger.info("Cleaning up external service...");
  }
}
```

### 4. Admin Page Component

Create `src/components/AdminPage.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { AdminPageProps, usePluginContext } from '@vyral/plugin-sdk';

export default function AdminPage({ title, pluginId }: AdminPageProps) {
  const context = usePluginContext();
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const apiKey = await context.api.getPluginSetting('api_key', '');
      const enableFeature = await context.api.getPluginSetting('enable_feature', true);

      setSettings({ apiKey, enableFeature });
    } catch (error) {
      context.logger.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      await context.api.setPluginSetting('api_key', settings.apiKey);
      await context.api.setPluginSetting('enable_feature', settings.enableFeature);

      // Show success message
      alert('Settings saved successfully!');
    } catch (error) {
      context.logger.error('Failed to save settings:', error);
      alert('Failed to save settings');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{title}</h1>

      <div className="grid gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            API Key
          </label>
          <input
            type="text"
            value={settings.apiKey}
            onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Enter your API key"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="enable_feature"
            checked={settings.enableFeature}
            onChange={(e) => setSettings({ ...settings, enableFeature: e.target.checked })}
            className="mr-2"
          />
          <label htmlFor="enable_feature" className="text-sm font-medium">
            Enable Feature
          </label>
        </div>

        <button
          onClick={saveSettings}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
```

## 🎣 Available Hooks

The Plugin SDK provides numerous hooks to extend Vyral CMS functionality:

### Content Hooks

- `content:before-create` - Modify content before creation
- `content:after-create` - React to content creation
- `content:before-update` - Modify content before updates
- `content:after-update` - React to content updates
- `content:before-render` - Modify content before rendering
- `content:after-render` - Modify rendered HTML

### User Hooks

- `user:before-create` - Modify user data before creation
- `user:after-login` - React to user login
- `user:before-logout` - React to user logout

### Admin Hooks

- `admin:menu` - Add items to admin menu
- `admin:dashboard-widgets` - Add dashboard widgets
- `admin:settings-tabs` - Add settings tabs

### Frontend Hooks

- `frontend:head` - Add content to HTML head
- `frontend:footer` - Add content to footer
- `frontend:sidebar` - Modify sidebar content

## 🧩 Components

### Admin Pages

```typescript
@AdminPage({ title: 'My Settings', slug: 'my-settings', icon: 'Settings' })
export class MySettingsPage extends React.Component<AdminPageProps> {
  render() {
    return <div>My settings page content</div>;
  }
}
```

### Widgets

```typescript
@Widget({ title: 'Latest Posts', description: 'Display latest blog posts' })
export class LatestPostsWidget extends React.Component<WidgetProps> {
  render() {
    return (
      <div className="widget">
        <h3>{this.props.title}</h3>
        {/* Widget content */}
      </div>
    );
  }
}
```

### Shortcodes

```typescript
@Shortcode({ tag: 'my-button', description: 'Custom button shortcode' })
export class ButtonShortcode extends React.Component<ShortcodeProps> {
  render() {
    const { attributes, content } = this.props;
    return (
      <button className={`btn btn-${attributes.style || 'primary'}`}>
        {content || attributes.text || 'Click me'}
      </button>
    );
  }
}
```

## 🛣️ API Routes

```typescript
export default class MyPlugin extends BasePlugin {
  protected registerRoutes(): void {
    this.registerRoute("/api/my-plugin/data", this.getData.bind(this), "GET");
    this.registerRoute("/api/my-plugin/data", this.saveData.bind(this), "POST");
  }

  @Get("/api/my-plugin/stats")
  private async getStats(req: Request, res: Response) {
    try {
      const stats = await this.calculateStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  @Post("/api/my-plugin/webhook", { permission: "admin" })
  private async handleWebhook(req: Request, res: Response) {
    // Handle webhook data
    const payload = req.body;
    await this.processWebhook(payload);
    res.json({ success: true });
  }
}
```

## ⚙️ Settings Management

```typescript
export default class MyPlugin extends BasePlugin {
  @TextSetting("api_endpoint", "API Endpoint", {
    default: "https://api.example.com",
    description: "The API endpoint URL",
  })
  private apiEndpoint: string = "";

  @BooleanSetting("debug_mode", "Debug Mode", false)
  private debugMode: boolean = false;

  @SelectSetting("theme", "Theme", [
    { label: "Light", value: "light" },
    { label: "Dark", value: "dark" },
  ])
  private theme: string = "light";

  @NumberSetting("max_items", "Max Items", 10, {
    description: "Maximum number of items to display",
  })
  private maxItems: number = 10;

  private async useSettings() {
    const endpoint = await this.getSetting("api_endpoint");
    const debug = await this.getSetting("debug_mode");

    if (debug) {
      this.logger.debug(`Using API endpoint: ${endpoint}`);
    }
  }
}
```

## 🔧 Utilities

The SDK provides many utility functions:

```typescript
import {
  slugify,
  generateId,
  formatDate,
  hash,
  validateEmail,
  escapeHtml,
} from "@vyral/plugin-sdk/utils";

// String utilities
const slug = slugify("Hello World!"); // 'hello-world'
const id = generateId(12); // 'aB3xY9mN4kL2'

// Date utilities
const formatted = formatDate(new Date(), "yyyy-MM-dd");

// Crypto utilities
const hashed = hash("some data", "sha256");

// Validation
const isValid = validateEmail("user@example.com");

// HTML utilities
const safe = escapeHtml('<script>alert("xss")</script>');
```

## 🧪 Testing Plugins

```typescript
import { PluginManager } from "@vyral/plugin-sdk";
import MyPlugin from "../src/index";

describe("MyPlugin", () => {
  let pluginManager: PluginManager;
  let plugin: MyPlugin;

  beforeEach(async () => {
    pluginManager = new PluginManager();
    await pluginManager.initialize();

    // Create plugin instance
    plugin = new MyPlugin(mockContext);
    await plugin.activate();
  });

  afterEach(async () => {
    await plugin.deactivate();
  });

  test("should enhance content", async () => {
    const post = { content: "Original content" };
    const result = await plugin.enhanceContent(post, mockContext);

    expect(result.modified).toBe(true);
    expect(result.data.content).toContain("Enhanced by My Awesome Plugin");
  });

  test("should register admin menu", async () => {
    const menu = [];
    const result = await plugin.addAdminMenu(menu, mockContext);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].title).toBe("My Plugin");
  });
});
```

## 📚 Advanced Features

### Plugin Dependencies

```json
{
  "dependencies": {
    "other-plugin": "^1.0.0"
  }
}
```

### Conditional Hooks

```typescript
@ConditionalHook('content:before-render', (context) => context.user?.role === 'admin')
private async adminOnlyHook(post: Post, context: HookContext) {
  // This hook only runs for admin users
  return { data: post, modified: false, stop: false };
}
```

### Plugin Events

```typescript
export default class MyPlugin extends BasePlugin {
  protected async onActivate(): Promise<void> {
    // Listen for plugin events
    this.context.events.on(
      "other-plugin:data-updated",
      this.handleDataUpdate.bind(this)
    );
  }

  private handleDataUpdate(data: any): void {
    this.logger.info("Other plugin updated data:", data);
  }

  private triggerEvent(): void {
    // Emit custom events
    this.context.events.emit("my-plugin:status-changed", { status: "active" });
  }
}
```

## 🔐 Security Best Practices

1. **Validate all inputs** using Zod schemas
2. **Sanitize HTML content** before rendering
3. **Use permissions** to protect admin routes
4. **Hash sensitive data** before storage
5. **Validate webhook signatures** for external APIs

## 📖 API Reference

For complete API documentation, visit [docs.vyral.com/plugin-sdk](https://docs.vyral.com/plugin-sdk)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

Built with ❤️ by the Vyral team
