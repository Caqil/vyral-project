// app/admin/modules/[slug]/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Settings, Loader2, AlertCircle } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Alert,
  AlertDescription,
  Skeleton,
} from "@/components/ui";
import { toast } from "sonner";
import { ModuleMenuSettings } from "@/components/admin/module-menu-settings";

interface Module {
  _id: string;
  manifest: {
    name: string;
    slug: string;
    version: string;
    description: string;
    author: string;
    settings?: any[];
  };
  status: "installed" | "active" | "inactive" | "error";
  configValues: Record<string, any>;
}

export default function ModuleSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const slug = params.slug as string;

  useEffect(() => {
    if (slug) {
      fetchModule();
    }
  }, [slug]);

  const fetchModule = async () => {
    try {
      setLoading(true);
      setError(null);

      // First try to get module by slug
      const response = await fetch(`/api/admin/modules?slug=${slug}`);
      const data = await response.json();

      if (response.ok && data.modules && data.modules.length > 0) {
        setModule(data.modules[0]);
      } else {
        setError("Module not found");
      }
    } catch (err) {
      setError("Failed to load module");
      console.error("Error fetching module:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !module) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Module Settings</h1>
            <p className="text-muted-foreground">
              Configure module settings and menu items
            </p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || "Module not found"}. Please check if the module exists and
            try again.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/modules")}
          >
            Back to Modules
          </Button>
          <Button onClick={fetchModule}>
            <Loader2 className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {module.manifest.name} Settings
          </h1>
          <p className="text-muted-foreground">
            Configure settings and menu items for {module.manifest.name}
          </p>
        </div>
      </div>

      {/* Module Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Module Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Name
              </label>
              <p className="text-sm">{module.manifest.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Version
              </label>
              <p className="text-sm">{module.manifest.version}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Status
              </label>
              <p className="text-sm">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${
                    module.status === "active"
                      ? "bg-green-100 text-green-800"
                      : module.status === "inactive"
                        ? "bg-yellow-100 text-yellow-800"
                        : module.status === "error"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {module.status}
                </span>
              </p>
            </div>
          </div>

          {module.manifest.description && (
            <div className="mt-4">
              <label className="text-sm font-medium text-muted-foreground">
                Description
              </label>
              <p className="text-sm mt-1">{module.manifest.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Menu Settings */}
      <ModuleMenuSettings
        moduleSlug={module.manifest.slug}
        moduleName={module.manifest.name}
      />

      {/* Additional module-specific settings would go here */}
      {module.manifest.settings && module.manifest.settings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Module Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This module has {module.manifest.settings.length} configurable
              setting(s). Configuration interface coming soon.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
