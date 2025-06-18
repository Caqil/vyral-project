// plugins/oauth2-plugin/src/components/LoginButtons.tsx
import React, { useState, useEffect } from "react";
import { Github, Mail, AlertCircle } from "lucide-react";

interface OAuthProvider {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  enabled: boolean;
}

interface LoginButtonsProps {
  redirectUrl?: string;
  onError?: (error: string) => void;
  onSuccess?: () => void;
  className?: string;
}

export function LoginButtons({
  redirectUrl = "/admin",
  onError,
  onSuccess,
  className = "",
}: LoginButtonsProps) {
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState<string | null>(null);

  // Available OAuth providers with their configurations
  const availableProviders: Record<string, Omit<OAuthProvider, "enabled">> = {
    google: {
      id: "google",
      name: "Google",
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
      color: "hover:bg-blue-50 border-blue-200",
    },
    github: {
      id: "github",
      name: "GitHub",
      icon: Github,
      color: "hover:bg-gray-50 border-gray-200",
    },
    microsoft: {
      id: "microsoft",
      name: "Microsoft",
      icon: ({ className }: { className?: string }) => (
        <svg className={className} viewBox="0 0 24 24">
          <path fill="#f25022" d="M1 1h10v10H1z" />
          <path fill="#00a4ef" d="M13 1h10v10H13z" />
          <path fill="#7fba00" d="M1 13h10v10H1z" />
          <path fill="#ffb900" d="M13 13h10v10H13z" />
        </svg>
      ),
      color: "hover:bg-blue-50 border-blue-200",
    },
  };

  useEffect(() => {
    loadEnabledProviders();
  }, []);

  const loadEnabledProviders = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch OAuth plugin settings to see which providers are enabled
      const response = await fetch("/api/admin/plugins/oauth2-plugin/settings");

      if (!response.ok) {
        throw new Error("Failed to load OAuth settings");
      }

      const settings = await response.json();
      const enabledProviderIds = settings.enabled_providers || [];

      // Filter and create provider list
      const enabledProviders = enabledProviderIds
        .map((id: string) => ({
          ...availableProviders[id],
          enabled: true,
        }))
        .filter(Boolean);

      setProviders(enabledProviders);
    } catch (err) {
      console.error("Failed to load OAuth providers:", err);
      setError("Failed to load login options");

      // Fallback to show all providers
      setProviders(
        Object.values(availableProviders).map((p) => ({ ...p, enabled: true }))
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (providerId: string) => {
    try {
      setAuthenticating(providerId);
      setError(null);

      // Generate state parameter for security
      const state = generateStateParameter();
      sessionStorage.setItem("oauth_state", state);
      sessionStorage.setItem("oauth_redirect", redirectUrl);

      // Redirect to OAuth provider
      const authUrl = `/api/auth/oauth/${providerId}?state=${encodeURIComponent(state)}`;
      window.location.href = authUrl;
    } catch (err) {
      console.error(`OAuth login failed for ${providerId}:`, err);
      setError(`Failed to login with ${providerId}`);
      setAuthenticating(null);
      onError?.(err instanceof Error ? err.message : "Login failed");
    }
  };

  const generateStateParameter = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  };

  const getProviderIcon = (provider: OAuthProvider) => {
    const IconComponent = provider.icon;
    return <IconComponent className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-center py-4">
          <LoadingSpinner />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading login options...
          </span>
        </div>
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No OAuth providers are currently configured. Please contact your
            administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {providers.map((provider) => (
          <Button
            key={provider.id}
            variant="outline"
            className={`w-full h-12 text-left justify-start ${provider.color} transition-colors`}
            onClick={() => handleOAuthLogin(provider.id)}
            disabled={authenticating !== null}
          >
            <div className="flex items-center space-x-3">
              {authenticating === provider.id ? (
                <LoadingSpinner className="h-5 w-5" />
              ) : (
                getProviderIcon(provider)
              )}
              <span className="font-medium">
                {authenticating === provider.id
                  ? `Connecting to ${provider.name}...`
                  : `Continue with ${provider.name}`}
              </span>
            </div>
          </Button>
        ))}
      </div>

      {providers.length > 0 && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// CSS classes to add to your global styles or component
export const oAuthButtonStyles = `
  .oauth-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1rem;
    margin: 0.25rem 0;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    background: white;
    color: #374151;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.2s;
  }

  .oauth-btn:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    color: #1f2937;
  }

  .oauth-btn-google:hover {
    background: #fef3f2;
    border-color: #fca5a5;
  }

  .oauth-btn-github:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }

  .oauth-btn-microsoft:hover {
    background: #eff6ff;
    border-color: #93c5fd;
  }

  .oauth-providers {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e2e8f0;
  }

  .oauth-divider {
    position: relative;
    text-align: center;
    margin: 1rem 0;
  }

  .oauth-divider::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: #e2e8f0;
  }

  .oauth-divider span {
    background: white;
    padding: 0 1rem;
    color: #6b7280;
    font-size: 0.875rem;
  }
`;

export default LoginButtons;
