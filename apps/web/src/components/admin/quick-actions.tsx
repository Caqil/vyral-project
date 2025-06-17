import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Upload, Settings, Download } from "lucide-react";
import Link from "next/link";

export function QuickActions() {
  const actions = [
    {
      title: "New Post",
      description: "Create a new blog post",
      icon: Plus,
      href: "/admin/posts/new",
      variant: "default" as const,
    },
    {
      title: "Upload Media",
      description: "Add images and files",
      icon: Upload,
      href: "/admin/media/upload",
      variant: "secondary" as const,
    },
    {
      title: "Site Settings",
      description: "Configure your site",
      icon: Settings,
      href: "/admin/settings",
      variant: "outline" as const,
    },
    {
      title: "Export Data",
      description: "Backup your content",
      icon: Download,
      href: "/admin/export",
      variant: "outline" as const,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant={action.variant}
                className="w-full justify-start"
                asChild
              >
                <Link href={action.href}>
                  <Icon className="mr-2 h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">{action.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {action.description}
                    </div>
                  </div>
                </Link>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
