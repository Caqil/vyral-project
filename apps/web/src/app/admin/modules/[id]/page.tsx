"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Package, Settings, AlertCircle } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Alert,
  AlertDescription,
  Badge,
} from "@/components/ui";

export default function ModulePage() {
  const params = useParams();
  const router = useRouter();
  const [module, setModule] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const id = params.id as string;

  useEffect(() => {
    if (id) {
      fetchModule();
    }
  }, [id]);

  const fetchModule = async () => {
    try {
      // Try to fetch by ID first, then by slug
      let response = await fetch(`/api/admin/modules/${id}`);
      let data = await response.json();

      if (!response.ok) {
        // Try slug lookup
        response = await fetch(`/api/admin/modules?slug=${id}`);
        data = await response.json();

        if (response.ok && data.modules && data.modules.length > 0) {
          setModule(data.modules[0]);
        }
      } else {
        setModule(data.module);
      }
    } catch (err) {
      console.error("Error fetching module:", err);
    } finally {
      setLoading(false);
    }
  };

  const displayName = module?.manifest?.name || id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Module: {displayName}</h1>
          <p className="text-muted-foreground">Module dashboard and overview</p>
        </div>
      </div>

      {/* Module Not Found */}
      <Alert>
        <Package className="h-4 w-4" />
        <AlertDescription>
          This module doesn't have a custom dashboard page yet. Module-specific
          pages need to be created by the module developer.
        </AlertDescription>
      </Alert>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/modules/${id}/settings`)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure Settings
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/admin/modules")}
            >
              <Package className="h-4 w-4 mr-2" />
              All Modules
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>
              To create custom pages for this module, developers should create:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                <code>app/admin/{module?.manifest?.slug || id}/page.tsx</code> -
                Main module page
              </li>
              <li>
                <code>
                  app/admin/{module?.manifest?.slug || id}/[...path]/page.tsx
                </code>{" "}
                - Sub-pages
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
