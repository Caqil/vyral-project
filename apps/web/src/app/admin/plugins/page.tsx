import { Suspense } from "react";
import Link from "next/link";
import { Badge, Button, Input, LoadingSpinner, Skeleton } from "@vyral/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@vyral/ui";
import {
  Plus,
  Search,
  Download,
  Settings,
  Trash2,
  AlertCircle,
  CheckCircle,
  Upload,
  ExternalLink,
  Power,
  PowerOff,
} from "lucide-react";

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  status: "active" | "inactive" | "error" | "updating";
  isCore: boolean;
  hasUpdate: boolean;
  newVersion?: string;
  homepage?: string;
  configurable: boolean;
  dependencies: string[];
  screenshots: string[];
  lastUpdated: Date;
  downloadCount: number;
  rating: number;
}

async function getPlugins(): Promise<Plugin[]> {
  // Simulate API call - replace with actual plugin service
  return [
    {
      id: "seo-optimizer",
      name: "SEO Optimizer",
      version: "1.2.3",
      description:
        "Advanced SEO tools and meta tag management for better search engine visibility.",
      author: "Vyral Team",
      status: "active",
      isCore: false,
      hasUpdate: true,
      newVersion: "1.3.0",
      homepage: "https://vyral.com/plugins/seo",
      configurable: true,
      dependencies: [],
      screenshots: [],
      lastUpdated: new Date("2024-01-15"),
      downloadCount: 1250,
      rating: 4.8,
    },
    {
      id: "backup-manager",
      name: "Backup Manager",
      version: "2.1.0",
      description:
        "Automated backup solutions with cloud storage integration and scheduling.",
      author: "Vyral Team",
      status: "active",
      isCore: false,
      hasUpdate: false,
      homepage: "https://vyral.com/plugins/backup",
      configurable: true,
      dependencies: [],
      screenshots: [],
      lastUpdated: new Date("2024-01-10"),
      downloadCount: 950,
      rating: 4.6,
    },
    {
      id: "analytics-pro",
      name: "Analytics Pro",
      version: "1.0.5",
      description:
        "Comprehensive analytics dashboard with custom reporting and visitor insights.",
      author: "Third Party Dev",
      status: "inactive",
      isCore: false,
      hasUpdate: false,
      homepage: "https://example.com/analytics-pro",
      configurable: true,
      dependencies: ["seo-optimizer"],
      screenshots: [],
      lastUpdated: new Date("2023-12-20"),
      downloadCount: 2100,
      rating: 4.9,
    },
    {
      id: "core-content",
      name: "Core Content System",
      version: "1.0.0",
      description: "Essential content management functionality for Vyral CMS.",
      author: "Vyral Team",
      status: "active",
      isCore: true,
      hasUpdate: false,
      configurable: false,
      dependencies: [],
      screenshots: [],
      lastUpdated: new Date("2024-01-01"),
      downloadCount: 0,
      rating: 5.0,
    },
  ];
}

function PluginCard({ plugin }: { plugin: Plugin }) {
  const getStatusColor = (status: Plugin["status"]) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-50";
      case "inactive":
        return "text-gray-600 bg-gray-50";
      case "error":
        return "text-red-600 bg-red-50";
      case "updating":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status: Plugin["status"]) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4" />;
      case "inactive":
        return <PowerOff className="h-4 w-4" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      case "updating":
        return <LoadingSpinner size="sm" />;
      default:
        return <PowerOff className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{plugin.name}</CardTitle>
              {plugin.isCore && (
                <Badge variant="secondary" className="text-xs">
                  Core
                </Badge>
              )}
              {plugin.hasUpdate && (
                <Badge variant="destructive" className="text-xs">
                  Update Available
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>v{plugin.version}</span>
              <span>•</span>
              <span>by {plugin.author}</span>
              {plugin.rating > 0 && (
                <>
                  <span>•</span>
                  <span>★ {plugin.rating}</span>
                </>
              )}
            </div>
          </div>
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(plugin.status)}`}
          >
            {getStatusIcon(plugin.status)}
            <span className="capitalize">{plugin.status}</span>
          </div>
        </div>
        <CardDescription>{plugin.description}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {!plugin.isCore && (
              <Button
                variant={plugin.status === "active" ? "destructive" : "default"}
                size="sm"
              >
                {plugin.status === "active" ? (
                  <>
                    <PowerOff className="h-4 w-4 mr-1" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Power className="h-4 w-4 mr-1" />
                    Activate
                  </>
                )}
              </Button>
            )}

            {plugin.configurable && (
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" />
                Settings
              </Button>
            )}

            {plugin.hasUpdate && (
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Update to v{plugin.newVersion}
              </Button>
            )}
          </div>

          <div className="flex gap-1">
            {plugin.homepage && (
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}

            {!plugin.isCore && (
              <Button variant="ghost" size="sm">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {plugin.dependencies.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-1">Dependencies:</p>
            <div className="flex gap-1">
              {plugin.dependencies.map((dep) => (
                <Badge key={dep} variant="outline" className="text-xs">
                  {dep}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PluginsSkeleton() {
  return (
    <div className="grid gap-6">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-60" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function PluginsContent() {
  const plugins = await getPlugins();

  return (
    <div className="grid gap-6">
      {plugins.map((plugin) => (
        <PluginCard key={plugin.id} plugin={plugin} />
      ))}
    </div>
  );
}

export default function AdminPluginsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plugins</h1>
          <p className="text-muted-foreground">
            Manage your installed plugins and discover new ones
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Upload Plugin
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Browse Plugins
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input placeholder="Search plugins..." className="pl-10" />
        </div>

        <Button variant="outline" size="sm">
          All Status
        </Button>

        <Button variant="outline" size="sm">
          All Authors
        </Button>
      </div>

      <Suspense fallback={<PluginsSkeleton />}>
        <PluginsContent />
      </Suspense>
    </div>
  );
}
