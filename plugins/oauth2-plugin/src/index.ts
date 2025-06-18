import {
  BasePlugin,
  AdminPage,
  Setting,
  Route
} from "../../../packages/plugin-sdk";
import { Hook } from "../../../packages/plugin-sdk/src/hooks/index";
import { GoogleProvider } from "./providers/google";
import { GitHubProvider } from "./providers/github";
import { MicrosoftProvider } from "./providers/microsoft";
import { OAuthProvider, OAuthUser } from "./types/oauth";
import { HookContext } from "../../../packages/plugin-sdk/src/types/hooks";

export default class OAuth2Plugin extends BasePlugin {
  public config = {
    name: "oauth2-plugin",
    version: "1.0.0",
    description: "OAuth2 authentication provider for external services",
    author: "Vyral Team",
    vyralVersion: "^1.0.0",
  };

  private providers: Map<string, OAuthProvider> = new Map();

  protected async onActivate(): Promise<void> {
    this.logger.info("OAuth2 Plugin activated");
    
    // Initialize OAuth providers
    await this.initializeProviders();
  }

  protected async onDeactivate(): Promise<void> {
    this.logger.info("OAuth2 Plugin deactivated");
    this.providers.clear();
  }

  protected registerHooks(): void {
    this.registerHook("auth:before-login", this.handleOAuthLogin.bind(this));
    this.registerHook("frontend:login-form", this.addOAuthButtons.bind(this));
    this.registerHook("admin:menu", this.addAdminMenu.bind(this));
  }

  private async initializeProviders(): Promise<void> {
    const enabledProviders = await this.getSetting("enabled_providers", ["google"]);
    
    for (const providerName of enabledProviders) {
      switch (providerName) {
        case "google":
          const googleClientId = await this.getSetting("google_client_id");
          const googleClientSecret = await this.getSetting("google_client_secret");
          if (googleClientId && googleClientSecret) {
            this.providers.set("google", new GoogleProvider({
              clientId: googleClientId,
              clientSecret: googleClientSecret,
              redirectUri: `${process.env.NEXTAUTH_URL}/api/auth/oauth/google/callback`
            }));
          }
          break;
          
        case "github":
          const githubClientId = await this.getSetting("github_client_id");
          const githubClientSecret = await this.getSetting("github_client_secret");
          if (githubClientId && githubClientSecret) {
            this.providers.set("github", new GitHubProvider({
              clientId: githubClientId,
              clientSecret: githubClientSecret,
              redirectUri: `${process.env.NEXTAUTH_URL}/api/auth/oauth/github/callback`
            }));
          }
          break;
          
        case "microsoft":
          const microsoftClientId = await this.getSetting("microsoft_client_id");
          const microsoftClientSecret = await this.getSetting("microsoft_client_secret");
          if (microsoftClientId && microsoftClientSecret) {
            this.providers.set("microsoft", new MicrosoftProvider({
              clientId: microsoftClientId,
              clientSecret: microsoftClientSecret,
              redirectUri: `${process.env.NEXTAUTH_URL}/api/auth/oauth/microsoft/callback`
            }));
          }
          break;
      }
    }
    
    this.logger.info(`Initialized ${this.providers.size} OAuth providers`);
  }

  private async handleOAuthLogin(data: any, context: HookContext) {
    if (!data.provider || !this.providers.has(data.provider)) {
      return { data, modified: false, stop: false };
    }

    try {
      const provider = this.providers.get(data.provider)!;
      const authUrl = await provider.getAuthorizationUrl(data.state);
      
      return {
        data: { ...data, authUrl },
        modified: true,
        stop: false
      };
    } catch (error) {
      this.logger.error(`OAuth login error for ${data.provider}:`, error);
      throw error;
    }
  }

  public async handleOAuthInitiate(req: any, res: any) {
    const { provider } = req.params;
    const { state } = req.query;
    
    if (!this.providers.has(provider)) {
      return res.status(400).json({ error: "Invalid provider" });
    }

    try {
      const oauthProvider = this.providers.get(provider)!;
      const authUrl = await oauthProvider.getAuthorizationUrl(state);
      
      res.redirect(authUrl);
    } catch (error) {
      this.logger.error(`OAuth initiate error:`, error);
      res.status(500).json({ error: "OAuth initialization failed" });
    }
  }

  public async handleOAuthCallback(req: any, res: any) {
    const { provider } = req.params;
    const { code, state, error } = req.query;
    
    if (error) {
      this.logger.error(`OAuth callback error:`, error);
      return res.redirect("/auth/login?error=oauth_error");
    }

    if (!this.providers.has(provider)) {
      return res.status(400).json({ error: "Invalid provider" });
    }

    try {
      const oauthProvider = this.providers.get(provider)!;
      const tokens = await oauthProvider.exchangeCode(code);
      const userInfo = await oauthProvider.getUserInfo(tokens.access_token);
      
      // Find or create user
      const userService = this.api.getUserService();
      let user = await userService.findByEmail(userInfo.email);
      
      if (!user) {
        // Create new user
        user = await userService.create({
          email: userInfo.email,
          name: userInfo.name,
          avatar: userInfo.avatar,
          provider: provider,
          providerId: userInfo.id,
          emailVerified: true
        });
      } else {
        // Update existing user with OAuth info
        await userService.update(user.id, {
          provider: provider,
          providerId: userInfo.id,
          avatar: userInfo.avatar || user.avatar
        });
      }

      // Create session
      const sessionToken = await this.api.auth.createSession(user.id, {
        provider: provider,
        loginMethod: "oauth"
      });

      // Set session cookie and redirect
      res.cookie("session-token", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
      
      res.redirect(state || "/admin");
    } catch (error) {
      this.logger.error(`OAuth callback processing error:`, error);
      res.redirect("/auth/login?error=oauth_callback_error");
    }
  }

  private async addOAuthButtons(html: string, context: HookContext) {
    const providers = Array.from(this.providers.keys());
    
    if (providers.length === 0) {
      return { data: html, modified: false, stop: false };
    }

    const oauthButtons = providers.map(provider => `
      <a href="/api/auth/oauth/${provider}" 
         class="oauth-btn oauth-btn-${provider}">
        Continue with ${provider.charAt(0).toUpperCase() + provider.slice(1)}
      </a>
    `).join("");

    const modifiedHtml = html.replace(
      "</form>",
      `</form><div class="oauth-providers">${oauthButtons}</div>`
    );

    return {
      data: modifiedHtml,
      modified: true,
      stop: false
    };
  }

  private async addAdminMenu(menu: any[], context: HookContext) {
    const settingsIndex = menu.findIndex(item => item.slug === "settings");
    
    if (settingsIndex !== -1) {
      if (!menu[settingsIndex].children) {
        menu[settingsIndex].children = [];
      }
      
      menu[settingsIndex].children.push({
        title: "OAuth2 Settings",
        slug: "oauth2-settings",
        icon: "Key",
        component: "OAuthSettings"
      });
    }

    return { data: menu, modified: true, stop: false };
  }
}