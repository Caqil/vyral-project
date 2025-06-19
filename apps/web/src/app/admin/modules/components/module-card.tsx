"use client";

import { useState } from "react";
import {
  Play,
  Pause,
  Settings,
  Trash2,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui";
import { ModuleSettings } from "./module-settings";

interface ModuleCardProps {
  module: {
    _id: string;
    manifest: {
      name: string;
      slug: string;
      version: string;
      description: string;
      author: string;
      category: string;
      tags: string[];
      icon?: string;
      features: Array<{
        name: string;
        description: string;
        enabled: boolean;
      }>;
    };
    status: "installed" | "active" | "inactive" | "error";
    installedAt: string;
    configValues: Record<string, any>;
  };
  onAction: (
    moduleId: string,
    action: "activate" | "deactivate" | "uninstall"
  ) => void;
}

export function ModuleCard({ module, onAction }: ModuleCardProps) {
  const [isActivating, setIsActivating] = useState(false);
  const [showUninstallDialog, setShowUninstallDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const getStatusIcon = () => {
    switch (module.status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (module.status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "error":
        return "bg-red-100 text-red-800 border-red-200";
      case "inactive":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const handleToggleActivation = async () => {
    setIsActivating(true);
    try {
      const action = module.status === "active" ? "deactivate" : "activate";
      await onAction(module._id, action);
    } finally {
      setIsActivating(false);
    }
  };

  const handleUninstall = () => {
    onAction(module._id, "uninstall");
    setShowUninstallDialog(false);
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              {module.manifest.icon ? (
                <img
                  src={module.manifest.icon}
                  alt=""
                  className="w-10 h-10 rounded"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  {module.manifest.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg leading-tight">
                  {module.manifest.name}
                </CardTitle>
                <CardDescription className="text-sm">
                  v{module.manifest.version} by {module.manifest.author}
                </CardDescription>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowSettings(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => setShowUninstallDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Uninstall
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {module.manifest.description}
          </p>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getStatusColor()}>
              <div className="flex items-center gap-1">
                {getStatusIcon()}
                {module.status.charAt(0).toUpperCase() + module.status.slice(1)}
              </div>
            </Badge>
            <Badge variant="secondary">{module.manifest.category}</Badge>
          </div>

          <div className="flex flex-wrap gap-1">
            {module.manifest.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {module.manifest.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{module.manifest.tags.length - 3} more
              </Badge>
            )}
          </div>

          <div className="pt-2">
            <Button
              onClick={handleToggleActivation}
              disabled={isActivating || module.status === "error"}
              className="w-full"
              variant={module.status === "active" ? "outline" : "default"}
            >
              {isActivating ? (
                <Clock className="mr-2 h-4 w-4 animate-spin" />
              ) : module.status === "active" ? (
                <Pause className="mr-2 h-4 w-4" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {isActivating
                ? "Processing..."
                : module.status === "active"
                  ? "Deactivate"
                  : "Activate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Uninstall Confirmation Dialog */}
      <AlertDialog
        open={showUninstallDialog}
        onOpenChange={setShowUninstallDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Uninstall Module</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to uninstall "{module.manifest.name}"? This
              action cannot be undone and will remove all module data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUninstall}
              className="bg-red-600 hover:bg-red-700"
            >
              Uninstall
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Settings Dialog */}
      <ModuleSettings
        module={module}
        open={showSettings}
        onOpenChange={setShowSettings}
      />
    </>
  );
}
