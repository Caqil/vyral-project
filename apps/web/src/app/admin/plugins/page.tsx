
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
  Globe,
  Clock,
  User,
} from "lucide-react";
import { PluginActionButtons } from "@/components/admin/plugins/PluginActionButtons";
import { PluginUploadDialog } from "@/components/admin/plugins/PluginUploadDialog";

interface Plugin {
  id: string;
  name: string;
  displayName?: string;
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
  category?: string;
  tags?: string[];
  size?: string;
  downloadCount?: number;
}

async function getPlugins(): Promise<Plugin[]> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || ""}/api/admin/plugins`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
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

function getStatusIcon(status: string) {
  switch (status) {
    case "activated":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    case "deactivated":
      return <PowerOff className="h-4 w-4 text-gray-400" />;
    default:
      return <Package className="h-4 w-4 text-blue-600" />;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "activated":
      return "bg-green-50 text-green-700 border-green-200";
    case "error":
      return "bg-red-50 text-red-700 border-red-200";
    case "deactivated":
      return "bg-gray-50 text-gray-700 border-gray-200";
    default:
      return "bg-blue-50 text-blue-700 border-blue-200";
  }
}

function getStatusText(status: string) {
  switch (status) {
    case "activated":
      return "Active";
    case "error":
      return "Error";
    case "deactivated":
      return "Inactive";
    case "loaded":
      return "Loaded";
    default:
      return "Unknown";
  }
}

function PluginCard({ plugin }: { plugin: Plugin }) {
  return (
    <Card className="relative hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-medium text-gray-900 truncate">
                {plugin.displayName || plugin.name}
              </CardTitle>
              <CardDescription className="text-sm text-gray-500">
                by {plugin.author}
              </CardDescription>
              {plugin.category && (
                <Badge variant="outline" className="mt-1 text-xs">
                  {plugin.category}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(plugin.status)}
            <Badge
              variant="outline"
              className={`text-xs ${getStatusColor(plugin.status)}`}
            >
              {getStatusText(plugin.status)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600 line-clamp-2">
          {plugin.description}
        </p>

        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Package className="h-3 w-3" />
            <span>v{plugin.version}</span>
          </div>
          {plugin.lastUpdated && (
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>
                {new Date(plugin.lastUpdated).toLocaleDateString()}
              </span>
            </div>
          )}
          {plugin.size && (
            <div className="flex items-center space-x-1">
              <Download className="h-3 w-3" />
              <span>{plugin.size}</span>
            </div>
          )}
        </div>

        {plugin.tags && plugin.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {plugin.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {plugin.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{plugin.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {plugin.dependencies && plugin.dependencies.length > 0 && (
          <div className="flex items-center space-x-2 p-2 bg-yellow-50 rounded-md">
            <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
            <span className="text-sm text-yellow-800">
              Requires: {plugin.dependencies.join(", ")}
            </span>
          </div>
        )}

        {plugin.status === "error" && plugin.errorMessage && (
          <div className="flex items-center space-x-2 p-2 bg-red-50 rounded-md">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <span className="text-sm text-red-800">{plugin.errorMessage}</span>
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

        <div className="flex items-center justify-between pt-3 border-t">
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

          <PluginActionButtons plugin={plugin} />
        </div>
      </CardContent>
    </Card>
  );
}

function PluginsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-start space-x-3">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default async function PluginsPage() {
  const plugins = await getPlugins();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plugins</h1>
          <p className="text-gray-600">
            Extend your CMS with powerful plugins
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <PluginUploadDialog />
          <Button variant="outline" asChild>
            <Link href="/admin/plugins/browse">
              <Plus className="h-4 w-4 mr-2" />
              Browse Registry
            </Link>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search plugins..."
                className="pl-10"
                // Add search functionality here
              />
            </div>
            <select className="px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="">All Categories</option>
              <option value="utility">Utility</option>
              <option value="content">Content</option>
              <option value="seo">SEO</option>
              <option value="social">Social</option>
            </select>
            <select className="px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="">All Status</option>
              <option value="activated">Active</option>
              <option value="deactivated">Inactive</option>
              <option value="error">Error</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Plugin Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {plugins.filter((p) => p.status === "activated").length}
            </div>
            <div className="text-sm text-gray-600">Active Plugins</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">
              {plugins.length}
            </div>
            <div className="text-sm text-gray-600">Total Plugins</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {plugins.filter((p) => p.hasUpdate).length}
            </div>
            <div className="text-sm text-gray-600">Updates Available</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {plugins.filter((p) => p.status === "error").length}
            </div>
            <div className="text-sm text-gray-600">Errors</div>
          </CardContent>
        </Card>
      </div>

      {/* Plugins List */}
      {plugins.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No plugins installed
            </h3>
            <p className="text-gray-600 mb-6">
              Get started by uploading a plugin or browsing the plugin registry.
            </p>
            <div className="flex justify-center gap-3">
              <PluginUploadDialog />
              <Button variant="outline" asChild>
                <Link href="/admin/plugins/browse">
                  <Plus className="h-4 w-4 mr-2" />
                  Browse Registry
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Suspense fallback={<PluginsSkeleton />}>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plugins.map((plugin) => (
              <PluginCard key={plugin.id} plugin={plugin} />
            ))}
          </div>
        </Suspense>
      )}
    </div>
  );
}
