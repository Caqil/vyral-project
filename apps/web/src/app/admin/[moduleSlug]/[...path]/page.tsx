"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, ExternalLink } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Alert,
  AlertDescription,
} from "@/components/ui";

export default function ModuleRoutePage() {
  const params = useParams();
  const router = useRouter();

  const moduleSlug = params.moduleSlug as string;
  const path = params.path as string[];
  const fullPath = path ? path.join("/") : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {moduleSlug} - {fullPath || "Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            Module page: /{moduleSlug}/{fullPath}
          </p>
        </div>
      </div>

      {/* Page Not Found */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This module page hasn't been created yet. The module developer needs
          to create the corresponding page component.
        </AlertDescription>
      </Alert>

      {/* Developer Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>For Module Developers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            To create this page, add the following file to your project:
          </p>

          <div className="bg-muted p-4 rounded-lg">
            <code className="text-sm">
              app/admin/{moduleSlug}/{fullPath ? `${fullPath}/` : ""}page.tsx
            </code>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/admin/modules")}
            >
              Back to Modules
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                router.push(`/admin/modules/${moduleSlug}/settings`)
              }
            >
              Module Settings
            </Button>
            <Button variant="outline" asChild>
              <a
                href="https://docs.vyral.com/modules/creating-pages"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Documentation
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
