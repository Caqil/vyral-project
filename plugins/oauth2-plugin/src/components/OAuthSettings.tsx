// plugins/oauth2-plugin/src/components/OAuthSettings.tsx
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Save,
  Key,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Info,
  RefreshCw,
  Github,
  Mail,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface OAuthProviderConfig {
  id: string;
  name: string;
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  icon: React.ComponentType<any>;
  setupUrl: string;
  description: string;
}

interface OAuthSettings {
  enabled_providers: string[];
  google_client_id: string;
  google_client_secret: string;
  github_client_id: string;
  github_client_secret: string;
  microsoft_client_id: string;
  microsoft_client_secret: string;
  redirect_base_url: string;
}

export function OAuthSettings() {
  const [settings, setSettings] = useState<OAuthSettings>({
    enabled_providers: [],
    google_client_id: "",
    google_client_secret: "",
    github_client_id: "",
    github_client_secret: "",
    microsoft_client_id: "",
    microsoft_client_secret: "",
    redirect_base_url: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : process.env.NEXTAUTH_URL || "http://localhost:3000";

  const providers: OAuthProviderConfig[] = [
    {
      id: "google",
      name: "Google",
      enabled: settings.enabled_providers.includes("google"),
      clientId: settings.google_client_id,
      clientSecret: settings.google_client_secret,
      redirectUri: `${baseUrl}/api/auth/oauth/google/callback`,
      scopes: ["openid", "email", "profile"],
      icon: ({ className }: { className?: string }) => (
        <svg className={className} viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      ),
      setupUrl: "https://console.cloud.google.com/apis/credentials",
      description: "Allow users to sign in with their Google account",
    },
    {
      id: "github",
      name: "GitHub",
      enabled: settings.enabled_providers.includes("github"),
      clientId: settings.github_client_id,
      clientSecret: settings.github_client_secret,
      redirectUri: `${baseUrl}/api/auth/oauth/github/callback`,
      scopes: ["user:email", "read:user"],
      icon: Github,
      setupUrl: "https://github.com/settings/applications/new",
      description: "Allow users to sign in with their GitHub account",
    },
    {
      id: "microsoft",
      name: "Microsoft",
      enabled: settings.enabled_providers.includes("microsoft"),
      clientId: settings.microsoft_client_id,
      clientSecret: settings.microsoft_client_secret,
      redirectUri: `${baseUrl}/api/auth/oauth/microsoft/callback`,
      scopes: ["openid", "profile", "email"],
      icon: ({ className }: { className?: string }) => (
        <svg className={className} viewBox="0 0 24 24">
          <path fill="#f25022" d="M1 1h10v10H1z" />
          <path fill="#00a4ef" d="M13 1h10v10H13z" />
          <path fill="#7fba00" d="M1 13h10v10H1z" />
          <path fill="#ffb900" d="M13 13h10v10H13z" />
        </svg>
      ),
      setupUrl:
        "https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
      description: "Allow users to sign in with their Microsoft account",
    },
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/admin/plugins/oauth2-plugin/settings");
      if (!response.ok) {
        throw new Error("Failed to load OAuth settings");
      }

      const data = await response.json();
      setSettings({
        enabled_providers: data.enabled_providers || [],
        google_client_id: data.google_client_id || "",
        google_client_secret: data.google_client_secret || "",
        github_client_id: data.github_client_id || "",
        github_client_secret: data.github_client_secret || "",
        microsoft_client_id: data.microsoft_client_id || "",
        microsoft_client_secret: data.microsoft_client_secret || "",
        redirect_base_url: data.redirect_base_url || baseUrl,
      });
    } catch (err) {
      console.error("Failed to load OAuth settings:", err);
      setError("Failed to load OAuth settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(
        "/api/admin/plugins/oauth2-plugin/settings",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(settings),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save OAuth settings");
      }

      toast.success("OAuth settings saved successfully");
    } catch (err) {
      console.error("Failed to save OAuth settings:", err);
      setError("Failed to save OAuth settings");
      toast.error("Failed to save OAuth settings");
    } finally {
      setSaving(false);
    }
  };

  const toggleProvider = (providerId: string) => {
    const newEnabledProviders = settings.enabled_providers.includes(providerId)
      ? settings.enabled_providers.filter((id) => id !== providerId)
      : [...settings.enabled_providers, providerId];

    setSettings({
      ...settings,
      enabled_providers: newEnabledProviders,
    });
  };

  const updateProviderSetting = (key: keyof OAuthSettings, value: string) => {
    setSettings({
      ...settings,
      [key]: value,
    });
  };

  const testOAuthConnection = async (providerId: string) => {
    try {
      setTestingProvider(providerId);

      const response = await fetch(
        `/api/admin/plugins/oauth2-plugin/test/${providerId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clientId:
              settings[`${providerId}_client_id` as keyof OAuthSettings],
            clientSecret:
              settings[`${providerId}_client_secret` as keyof OAuthSettings],
          }),
        }
      );

      if (!response.ok) {
        throw new Error("OAuth test failed");
      }

      toast.success(`${providerId} OAuth connection test successful`);
    } catch (err) {
      console.error(`OAuth test failed for ${providerId}:`, err);
      toast.error(`${providerId} OAuth connection test failed`);
    } finally {
      setTestingProvider(null);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      toast.error("Failed to copy to clipboard");
    }
  };

  const renderProviderConfig = (provider: OAuthProviderConfig) => {
    const isConfigured = provider.clientId && provider.clientSecret;
    const IconComponent = provider.icon;

    return (
      <Card key={provider.id}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <IconComponent className="h-6 w-6" />
              <div>
                <CardTitle className="text-lg">{provider.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {provider.description}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isConfigured && (
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Configured
                </Badge>
              )}
              <Switch
                checked={provider.enabled}
                onCheckedChange={() => toggleProvider(provider.id)}
                disabled={!isConfigured}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Setup Instructions */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>To set up {provider.name} OAuth:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>
                    Go to the{" "}
                    <a
                      href={provider.setupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {provider.name} Developer Console{" "}
                      <ExternalLink className="h-3 w-3 inline" />
                    </a>
                  </li>
                  <li>Create a new OAuth application</li>
                  <li>
                    Set the redirect URI to:{" "}
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">
                      {provider.redirectUri}
                    </code>
                  </li>
                  <li>Copy the Client ID and Client Secret below</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>

          {/* Configuration Fields */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${provider.id}_client_id`}>Client ID</Label>
              <div className="flex space-x-2">
                <Input
                  id={`${provider.id}_client_id`}
                  type="text"
                  placeholder="Enter Client ID"
                  value={provider.clientId}
                  onChange={(e) =>
                    updateProviderSetting(
                      `${provider.id}_client_id` as keyof OAuthSettings,
                      e.target.value
                    )
                  }
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    copyToClipboard(
                      provider.clientId,
                      `${provider.id}_client_id`
                    )
                  }
                  disabled={!provider.clientId}
                >
                  {copiedField === `${provider.id}_client_id` ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${provider.id}_client_secret`}>
                Client Secret
              </Label>
              <div className="flex space-x-2">
                <Input
                  id={`${provider.id}_client_secret`}
                  type="password"
                  placeholder="Enter Client Secret"
                  value={provider.clientSecret}
                  onChange={(e) =>
                    updateProviderSetting(
                      `${provider.id}_client_secret` as keyof OAuthSettings,
                      e.target.value
                    )
                  }
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    copyToClipboard(
                      provider.clientSecret,
                      `${provider.id}_client_secret`
                    )
                  }
                  disabled={!provider.clientSecret}
                >
                  {copiedField === `${provider.id}_client_secret` ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Redirect URI Display */}
          <div className="space-y-2">
            <Label>Redirect URI (copy this to your OAuth app)</Label>
            <div className="flex space-x-2">
              <Input
                value={provider.redirectUri}
                readOnly
                className="bg-muted"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  copyToClipboard(
                    provider.redirectUri,
                    `${provider.id}_redirect`
                  )
                }
              >
                {copiedField === `${provider.id}_redirect` ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>

          {/* Scopes Display */}
          <div className="space-y-2">
            <Label>Required Scopes</Label>
            <div className="flex flex-wrap gap-1">
              {provider.scopes.map((scope) => (
                <Badge key={scope} variant="secondary">
                  {scope}
                </Badge>
              ))}
            </div>
          </div>

          {/* Test Connection */}
          {isConfigured && (
            <div className="pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => testOAuthConnection(provider.id)}
                disabled={testingProvider === provider.id}
              >
                {testingProvider === provider.id ? (
                  <>
                    <LoadingSpinner className="h-3 w-3 mr-2" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Key className="h-3 w-3 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <LoadingSpinner />
          <span>Loading OAuth settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">OAuth2 Settings</h1>
          <p className="text-muted-foreground">
            Configure OAuth providers for user authentication
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadSettings}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <>
                <LoadingSpinner className="h-4 w-4 mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="providers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="providers">OAuth Providers</TabsTrigger>
          <TabsTrigger value="general">General Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-6">
          <div className="space-y-6">{providers.map(renderProviderConfig)}</div>
        </TabsContent>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General OAuth Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="redirect_base_url">Base URL</Label>
                <Input
                  id="redirect_base_url"
                  type="url"
                  placeholder="https://yourdomain.com"
                  value={settings.redirect_base_url}
                  onChange={(e) =>
                    updateProviderSetting("redirect_base_url", e.target.value)
                  }
                />
                <p className="text-sm text-muted-foreground">
                  The base URL used for OAuth redirects. This should match your
                  domain.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Currently Enabled Providers</Label>
                <div className="flex flex-wrap gap-2">
                  {settings.enabled_providers.length > 0 ? (
                    settings.enabled_providers.map((providerId) => {
                      const provider = providers.find(
                        (p) => p.id === providerId
                      );
                      return provider ? (
                        <Badge key={providerId} variant="default">
                          {provider.name}
                        </Badge>
                      ) : null;
                    })
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No providers enabled
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default OAuthSettings;
