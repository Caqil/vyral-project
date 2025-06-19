"use client";

import { useState, useEffect } from "react";
import {
  Upload,
  Download,
  Settings,
  Trash2,
  Play,
  Pause,
  Plus,
  Search,
  Filter,
} from "lucide-react";
import {
  Button,
  Card,
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { ModuleCard } from "./components/module-card";
import { ModuleUpload } from "./components/module-upload";
import { toast } from "sonner";

interface Module {
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
}

export default function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const categories = [
    { value: "all", label: "All Categories" },
    { value: "social", label: "Social Networking" },
    { value: "ecommerce", label: "E-commerce" },
    { value: "seo", label: "SEO" },
    { value: "analytics", label: "Analytics" },
    { value: "content", label: "Content" },
    { value: "utility", label: "Utility" },
    { value: "security", label: "Security" },
  ];

  const statuses = [
    { value: "all", label: "All Statuses" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "installed", label: "Installed" },
    { value: "error", label: "Error" },
  ];

  useEffect(() => {
    fetchModules();
  }, [selectedCategory, selectedStatus]);

  const fetchModules = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== "all")
        params.append("category", selectedCategory);
      if (selectedStatus !== "all") params.append("status", selectedStatus);

      const response = await fetch(`/api/admin/modules?${params}`);
      const data = await response.json();

      if (response.ok) {
        setModules(data.modules);
      } else {
        toast.error(data.error || "Failed to fetch modules");
      }
    } catch (error) {
      toast.error("Failed to fetch modules");
    } finally {
      setLoading(false);
    }
  };

  const handleModuleAction = async (
    moduleId: string,
    action: "activate" | "deactivate" | "uninstall"
  ) => {
    try {
      const endpoint =
        action === "uninstall"
          ? `/api/admin/modules/${moduleId}`
          : `/api/admin/modules/${moduleId}/${action}`;

      const method = action === "uninstall" ? "DELETE" : "POST";

      const response = await fetch(endpoint, { method });
      const data = await response.json();

      if (response.ok) {
        toast(data.message);
        fetchModules();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error(`Failed to ${action} module`);
    }
  };

  const filteredModules = modules.filter((module) => {
    const matchesSearch =
      module.manifest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      module.manifest.description
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      module.manifest.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      );
    return matchesSearch;
  });

  const activeModules = filteredModules.filter((m) => m.status === "active");
  const inactiveModules = filteredModules.filter((m) => m.status !== "active");

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Modules</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                <div className="h-8 bg-gray-300 rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Modules</h1>
          <p className="text-muted-foreground">
            Extend your CMS with powerful modules
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Browse Store
          </Button>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Upload Module
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search modules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>
        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Modules Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All Modules ({filteredModules.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({activeModules.length})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive ({inactiveModules.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredModules.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No modules found</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredModules.map((module) => (
                <ModuleCard
                  key={module._id}
                  module={module}
                  onAction={handleModuleAction}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeModules.map((module) => (
              <ModuleCard
                key={module._id}
                module={module}
                onAction={handleModuleAction}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inactiveModules.map((module) => (
              <ModuleCard
                key={module._id}
                module={module}
                onAction={handleModuleAction}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <ModuleUpload
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSuccess={fetchModules}
      />
    </div>
  );
}
