// components/admin/module-menu-settings.tsx (Debug Version)
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
} from "@/components/ui";
import {
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Settings,
  AlertCircle,
  Bug,
} from "lucide-react";
import { toast } from "sonner";

interface ModuleMenuItem {
  id: string;
  name: string;
  href: string;
  icon?: string;
  moduleSlug: string;
  moduleName: string;
  order?: number;
  permission?: string;
  badge?: string | number;
}

interface ModuleMenuSettingsProps {
  moduleSlug: string;
  moduleName: string;
}

export function ModuleMenuSettings({
  moduleSlug,
  moduleName,
}: ModuleMenuSettingsProps) {
  const [menuItems, setMenuItems] = useState<ModuleMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [showDebug, setShowDebug] = useState(true);

  const availableIcons = [
    "LayoutDashboard",
    "FileText",
    "Users",
    "Image",
    "Settings",
    "Puzzle",
    "ShoppingCart",
    "Package",
    "CreditCard",
    "BarChart3",
    "Calendar",
    "Mail",
    "Phone",
    "MessageSquare",
    "Heart",
  ];

  useEffect(() => {
    console.log("🔄 ModuleMenuSettings: Component mounted");
    console.log("📋 Props:", { moduleSlug, moduleName });
    fetchMenuItems();
  }, [moduleSlug]);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);

      const url = `/api/admin/modules/${moduleSlug}/menu`;
      console.log("🔗 Fetching from URL:", url);

      setDebugInfo((prev) => ({
        ...prev,
        fetchAttempt: new Date().toISOString(),
        url,
        moduleSlug,
        moduleName,
      }));

      const response = await fetch(url);
      const data = await response.json();

      console.log("📡 Response status:", response.status);
      console.log("📊 Response data:", data);

      setDebugInfo((prev) => ({
        ...prev,
        responseStatus: response.status,
        responseData: data,
        error: response.ok ? null : data.error,
      }));

      if (response.ok) {
        console.log("✅ Menu items fetched successfully:", data.menuItems);
        setMenuItems(data.menuItems || []);
      } else {
        console.error("❌ Failed to fetch menu items:", data.error);
        toast.error(data.error || "Failed to fetch menu items");
      }
    } catch (error) {
      console.error("💥 Fetch error:", error);
      setDebugInfo((prev) => ({
        ...prev,
        fetchError: error instanceof Error ? error.message : String(error),
      }));
      toast.error("Error fetching menu items");
    } finally {
      setLoading(false);
    }
  };

  const addMenuItem = () => {
    const newItem: ModuleMenuItem = {
      id: `item-${Date.now()}`,
      name: "New Menu Item",
      href: `/admin/modules/${moduleSlug}/new-page`,
      icon: "Puzzle",
      moduleSlug,
      moduleName,
      order: menuItems.length,
    };

    setMenuItems([...menuItems, newItem]);
    setHasChanges(true);
  };

  const updateMenuItem = (index: number, updates: Partial<ModuleMenuItem>) => {
    const updated = [...menuItems];
    updated[index] = { ...updated[index], ...updates };
    setMenuItems(updated);
    setHasChanges(true);
  };

  const removeMenuItem = (index: number) => {
    const updated = menuItems.filter((_, i) => i !== index);
    setMenuItems(updated);
    setHasChanges(true);
  };

  const saveMenuItems = async () => {
    try {
      setSaving(true);

      const url = `/api/admin/modules/${moduleSlug}/menu`;
      console.log("💾 Saving to URL:", url);
      console.log("📋 Menu items to save:", menuItems);

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ menuItems }),
      });

      const data = await response.json();
      console.log("💾 Save response:", data);

      if (response.ok) {
        toast.success("Menu items saved successfully");
        setHasChanges(false);
      } else {
        console.error("❌ Save failed:", data.error);
        toast.error(data.error || "Failed to save menu items");
      }
    } catch (error) {
      console.error("💥 Save error:", error);
      toast.error("Error saving menu items");
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    fetchMenuItems();
    setHasChanges(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Menu Settings - Loading...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Loading menu settings for: {moduleName} (slug: {moduleSlug})
              </AlertDescription>
            </Alert>

            {showDebug && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    Debug Info (Loading State)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs overflow-auto max-h-32">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-10 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Menu Settings for {moduleName}
        </CardTitle>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
          >
            <Bug className="h-4 w-4 mr-2" />
            {showDebug ? "Hide" : "Show"} Debug
          </Button>
          <Button variant="outline" size="sm" onClick={fetchMenuItems}>
            🔄 Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {showDebug && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Debug Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <strong>Module Slug:</strong> {moduleSlug}
                </div>
                <div>
                  <strong>Module Name:</strong> {moduleName}
                </div>
                <div>
                  <strong>Menu Items Count:</strong> {menuItems.length}
                </div>
                <div>
                  <strong>Has Changes:</strong> {hasChanges ? "Yes" : "No"}
                </div>
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer font-medium">
                  Raw Debug Data
                </summary>
                <pre className="text-xs overflow-auto max-h-40 mt-2 p-2 bg-white rounded border">
                  {JSON.stringify({ debugInfo, menuItems }, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        )}

        {hasChanges && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have unsaved changes. Don't forget to save your menu
              configuration.
            </AlertDescription>
          </Alert>
        )}

        {/* Menu Items List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Menu Items</h3>
            <Button onClick={addMenuItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          {menuItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No menu items configured</p>
              <p className="text-sm">
                Add menu items to appear in the admin sidebar
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {menuItems.map((item, index) => (
                <Card key={item.id} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Display Name</Label>
                      <Input
                        value={item.name}
                        onChange={(e) =>
                          updateMenuItem(index, { name: e.target.value })
                        }
                        placeholder="Menu item name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>URL Path</Label>
                      <Input
                        value={item.href}
                        onChange={(e) =>
                          updateMenuItem(index, { href: e.target.value })
                        }
                        placeholder="/admin/module/page"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Icon</Label>
                      <Select
                        value={item.icon}
                        onValueChange={(value) =>
                          updateMenuItem(index, { icon: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableIcons.map((icon) => (
                            <SelectItem key={icon} value={icon}>
                              {icon}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeMenuItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <Button
            onClick={saveMenuItems}
            disabled={!hasChanges || saving}
            className="min-w-[120px]"
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>

          {hasChanges && (
            <Button variant="outline" onClick={resetChanges} disabled={saving}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}

          <div className="text-sm text-muted-foreground">
            {menuItems.length} menu item{menuItems.length !== 1 ? "s" : ""}{" "}
            configured
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
