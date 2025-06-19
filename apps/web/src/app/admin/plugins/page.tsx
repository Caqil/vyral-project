import { Suspense } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  LoadingSpinner,
  Skeleton,
} from "@/components/ui";
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
  Package,
} from "lucide-react";

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  status: "loaded" | "activated" | "deactivated" | "error";
  isCore?: boolean;
  hasUpdate?: boolean;
  newVersion?: string;
  homepage?: string;
  configurable: boolean;
  dependencies: string[];
  lastUpdated?: Date;
  errorMessage?: string;
}

async function getPlugins(): Promise<Plugin[]> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || ""}/api/admin/plugins`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store", // Don't cache since we want fresh plugin data
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        // Plugins directory doesn't exist or no plugins found
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to fetch plugins:", error);
    return [];
  }
}

function getStatusIcon(status: Plugin["status"]) {
  switch (status) {
    case "activated":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "loaded":
    case "deactivated":
      return <Power className="h-4 w-4 text-gray-400" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Power className="h-4 w-4 text-gray-400" />;
  }
}

function getStatusColor(status: Plugin["status"]) {
  switch (status) {
    case "activated":
      return "bg-green-100 text-green-800 border-green-200";
    case "loaded":
    case "deactivated":
      return "bg-gray-100 text-gray-800 border-gray-200";
    case "error":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getStatusText(status: Plugin["status"]) {
  switch (status) {
    case "activated":
      return "Active";
    case "loaded":
      return "Loaded";
    case "deactivated":
      return "Inactive";
    case "error":
      return "Error";
    default:
      return "Unknown";
  }
}

async function PluginsList() {
  const plugins = await getPlugins();

  if (plugins.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto max-w-md">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No plugins installed
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by installing your first plugin or uploading a plugin
            package.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/admin/plugins/upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload Plugin
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/plugins/browse">
                <Plus className="h-4 w-4 mr-2" />
                Browse Plugin Registry
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {plugins.map((plugin) => (
        <Card key={plugin.id} className="relative">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-medium text-gray-900 truncate">
                  {plugin.name}
                </CardTitle>
                <CardDescription className="text-sm text-gray-500">
                  by {plugin.author}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2 ml-2">
                {getStatusIcon(plugin.status)}
                <Badge
                  variant="outline"
                  className={`text-xs ${getStatusColor(plugin.status)}`}
                >
                  {getStatusText(plugin.status)}
                </Badge>
              </div>
            </div>
            {plugin.isCore && (
              <Badge variant="secondary" className="w-fit text-xs">
                Core Plugin
              </Badge>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 line-clamp-2">
                {plugin.description}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>v{plugin.version}</span>
              {plugin.lastUpdated && (
                <span>Updated {plugin.lastUpdated.toLocaleDateString()}</span>
              )}
            </div>

            {plugin.dependencies.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-gray-500">Dependencies:</span>
                {plugin.dependencies.slice(0, 2).map((dep) => (
                  <Badge key={dep} variant="outline" className="text-xs">
                    {dep}
                  </Badge>
                ))}
                {plugin.dependencies.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{plugin.dependencies.length - 2}
                  </Badge>
                )}
              </div>
            )}

            {plugin.status === "error" && plugin.errorMessage && (
              <div className="flex items-start space-x-2 p-2 bg-red-50 rounded-md">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-red-800">
                  {plugin.errorMessage}
                </span>
              </div>
            )}

            {plugin.hasUpdate && (
              <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-md">
                <Download className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Update available: v{plugin.newVersion}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex space-x-2">
                {plugin.configurable && plugin.status === "activated" && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/plugins/${plugin.id}/settings`}>
                      <Settings className="h-3 w-3" />
                    </Link>
                  </Button>
                )}

                {plugin.homepage && (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={plugin.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                )}
              </div>

              <div className="flex space-x-2">
                {plugin.status === "activated" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    disabled={plugin.isCore}
                  >
                    <PowerOff className="h-3 w-3 mr-1" />
                    Deactivate
                  </Button>
                ) : plugin.status === "loaded" ||
                  plugin.status === "deactivated" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-600 hover:text-green-700"
                  >
                    <Power className="h-3 w-3 mr-1" />
                    Activate
                  </Button>
                ) : null}

                {!plugin.isCore && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function PluginsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plugins</h1>
          <p className="text-gray-600">
            Manage your installed plugins and extend your application
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" asChild>
            <Link href="/admin/plugins/upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload Plugin
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/plugins/browse">
              <Plus className="h-4 w-4 mr-2" />
              Browse Plugins
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input type="text" placeholder="Search plugins..." className="pl-9" />
        </div>
        <select className="rounded-md border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
          <option value="all">All Plugins</option>
          <option value="activated">Active</option>
          <option value="loaded">Loaded</option>
          <option value="deactivated">Inactive</option>
          <option value="error">Error</option>
        </select>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        }
      >
        <PluginsList />
      </Suspense>
    </div>
  );
}
