/**
 * ModuleSettings Component
 * File: apps/web/src/app/admin/modules/components/module-settings.tsx
 */

"use client";

import { useState, useEffect } from "react";
import { Settings, Save, X, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Checkbox,
  Alert,
  AlertDescription,
  Separator,
  Badge,
} from "@/components/ui";
import { toast } from "sonner";

interface ModuleSetting {
  key: string;
  type:
    | "string"
    | "number"
    | "boolean"
    | "select"
    | "multiselect"
    | "textarea"
    | "file"
    | "json";
  label: string;
  description?: string;
  default?: any;
  required?: boolean;
  options?: Array<{ label: string; value: any }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  group?: string;
  dependsOn?: string;
}

interface ModuleSettingsProps {
  module: {
    _id: string;
    manifest: {
      name: string;
      slug: string;
      version: string;
      settings?: ModuleSetting[];
    };
    status: string;
    configValues: Record<string, any>;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModuleSettings({
  module,
  open,
  onOpenChange,
}: ModuleSettingsProps) {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      // Initialize config with current values
      setConfig(module.configValues || {});
      setErrors({});
    }
  }, [open, module.configValues]);

  const settings = module.manifest.settings || [];

  // Group settings by group
  const groupedSettings = settings.reduce(
    (groups, setting) => {
      const group = setting.group || "general";
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(setting);
      return groups;
    },
    {} as Record<string, ModuleSetting[]>
  );

  const handleConfigChange = (key: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));

    // Clear error for this field
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const validateConfig = (): boolean => {
    const newErrors: Record<string, string> = {};

    settings.forEach((setting) => {
      const value = config[setting.key];

      // Check required fields
      if (
        setting.required &&
        (value === undefined || value === null || value === "")
      ) {
        newErrors[setting.key] = `${setting.label} is required`;
        return;
      }

      if (value === undefined || value === null) return;

      // Type-specific validation
      switch (setting.type) {
        case "number":
          if (typeof value !== "number" || isNaN(value)) {
            newErrors[setting.key] = `${setting.label} must be a valid number`;
            break;
          }
          if (
            setting.validation?.min !== undefined &&
            value < setting.validation.min
          ) {
            newErrors[setting.key] =
              `${setting.label} must be at least ${setting.validation.min}`;
          }
          if (
            setting.validation?.max !== undefined &&
            value > setting.validation.max
          ) {
            newErrors[setting.key] =
              `${setting.label} must be at most ${setting.validation.max}`;
          }
          break;

        case "string":
        case "textarea":
          if (typeof value !== "string") {
            newErrors[setting.key] = `${setting.label} must be text`;
            break;
          }
          if (
            setting.validation?.minLength &&
            value.length < setting.validation.minLength
          ) {
            newErrors[setting.key] =
              `${setting.label} must be at least ${setting.validation.minLength} characters`;
          }
          if (
            setting.validation?.maxLength &&
            value.length > setting.validation.maxLength
          ) {
            newErrors[setting.key] =
              `${setting.label} must be at most ${setting.validation.maxLength} characters`;
          }
          if (
            setting.validation?.pattern &&
            !new RegExp(setting.validation.pattern).test(value)
          ) {
            newErrors[setting.key] = `${setting.label} format is invalid`;
          }
          break;

        case "select":
          if (!setting.options?.some((opt) => opt.value === value)) {
            newErrors[setting.key] =
              `${setting.label} must be one of the allowed values`;
          }
          break;

        case "multiselect":
          if (!Array.isArray(value)) {
            newErrors[setting.key] = `${setting.label} must be a list`;
            break;
          }
          for (const val of value) {
            if (!setting.options?.some((opt) => opt.value === val)) {
              newErrors[setting.key] =
                `${setting.label} contains invalid value: ${val}`;
              break;
            }
          }
          break;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateConfig()) {
      toast.error("Please fix the errors before saving");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/modules/${module._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ config }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Module settings updated successfully");
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to update settings");
      }
    } catch (error) {
      toast.error("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const renderSettingField = (setting: ModuleSetting) => {
    const value = config[setting.key] ?? setting.default;
    const hasError = !!errors[setting.key];

    // Check if field should be disabled based on dependencies
    const isDisabled = setting.dependsOn && !config[setting.dependsOn];

    switch (setting.type) {
      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={setting.key}
              checked={!!value}
              onCheckedChange={(checked) =>
                handleConfigChange(setting.key, checked)
              }
              disabled={!!isDisabled}
            />
            <Label htmlFor={setting.key} className="text-sm font-medium">
              {setting.label}
            </Label>
            {setting.required && <span className="text-red-500">*</span>}
          </div>
        );

      case "number":
        return (
          <div className="space-y-2">
            <Label htmlFor={setting.key} className="text-sm font-medium">
              {setting.label}
              {setting.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={setting.key}
              type="number"
              value={value || ""}
              onChange={(e) =>
                handleConfigChange(setting.key, parseFloat(e.target.value))
              }
              disabled={!!isDisabled}
              className={hasError ? "border-red-500" : ""}
              min={setting.validation?.min}
              max={setting.validation?.max}
            />
            {hasError && (
              <p className="text-sm text-red-500">{errors[setting.key]}</p>
            )}
          </div>
        );

      case "string":
        return (
          <div className="space-y-2">
            <Label htmlFor={setting.key} className="text-sm font-medium">
              {setting.label}
              {setting.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={setting.key}
              type="text"
              value={value || ""}
              onChange={(e) => handleConfigChange(setting.key, e.target.value)}
              disabled={!!isDisabled}
              className={hasError ? "border-red-500" : ""}
              maxLength={setting.validation?.maxLength}
            />
            {hasError && (
              <p className="text-sm text-red-500">{errors[setting.key]}</p>
            )}
          </div>
        );

      case "textarea":
        return (
          <div className="space-y-2">
            <Label htmlFor={setting.key} className="text-sm font-medium">
              {setting.label}
              {setting.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={setting.key}
              value={value || ""}
              onChange={(e) => handleConfigChange(setting.key, e.target.value)}
              disabled={!!isDisabled}
              className={hasError ? "border-red-500" : ""}
              rows={3}
              maxLength={setting.validation?.maxLength}
            />
            {hasError && (
              <p className="text-sm text-red-500">{errors[setting.key]}</p>
            )}
          </div>
        );

      case "select":
        return (
          <div className="space-y-2">
            <Label htmlFor={setting.key} className="text-sm font-medium">
              {setting.label}
              {setting.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={value?.toString() || ""}
              onValueChange={(newValue) =>
                handleConfigChange(setting.key, newValue)
              }
              disabled={!!isDisabled}
            >
              <SelectTrigger className={hasError ? "border-red-500" : ""}>
                <SelectValue placeholder={`Select ${setting.label}`} />
              </SelectTrigger>
              <SelectContent>
                {setting.options?.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value.toString()}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasError && (
              <p className="text-sm text-red-500">{errors[setting.key]}</p>
            )}
          </div>
        );

      case "multiselect":
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {setting.label}
              {setting.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="space-y-2 border rounded-md p-3 max-h-32 overflow-y-auto">
              {setting.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${setting.key}-${option.value}`}
                    checked={
                      Array.isArray(value) && value.includes(option.value)
                    }
                    onCheckedChange={(checked) => {
                      const currentArray = Array.isArray(value) ? value : [];
                      if (checked) {
                        handleConfigChange(setting.key, [
                          ...currentArray,
                          option.value,
                        ]);
                      } else {
                        handleConfigChange(
                          setting.key,
                          currentArray.filter((v) => v !== option.value)
                        );
                      }
                    }}
                    disabled={!!isDisabled}
                  />
                  <Label
                    htmlFor={`${setting.key}-${option.value}`}
                    className="text-sm font-normal"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
            {hasError && (
              <p className="text-sm text-red-500">{errors[setting.key]}</p>
            )}
          </div>
        );

      case "json":
        return (
          <div className="space-y-2">
            <Label htmlFor={setting.key} className="text-sm font-medium">
              {setting.label}
              {setting.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={setting.key}
              value={
                typeof value === "object"
                  ? JSON.stringify(value, null, 2)
                  : value || ""
              }
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleConfigChange(setting.key, parsed);
                } catch {
                  handleConfigChange(setting.key, e.target.value);
                }
              }}
              disabled={!!isDisabled}
              className={`font-mono text-sm ${hasError ? "border-red-500" : ""}`}
              rows={4}
              placeholder='{"key": "value"}'
            />
            {hasError && (
              <p className="text-sm text-red-500">{errors[setting.key]}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (settings.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {module.manifest.name} Settings
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This module doesn't have any configurable settings.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {module.manifest.name} Settings
          </DialogTitle>
          <DialogDescription>
            Configure the module settings. Changes will take effect immediately
            for active modules.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {module.status !== "active" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This module is not currently active. Settings can be configured
                but won't take effect until the module is activated.
              </AlertDescription>
            </Alert>
          )}

          {Object.entries(groupedSettings).map(([groupName, groupSettings]) => (
            <div key={groupName} className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold capitalize">
                  {groupName}
                </h3>
                <Badge variant="outline" className="text-xs">
                  {groupSettings.length} setting
                  {groupSettings.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              <div className="space-y-4 pl-4 border-l-2 border-gray-100">
                {groupSettings.map((setting) => (
                  <div key={setting.key} className="space-y-1">
                    {renderSettingField(setting)}
                    {setting.description && (
                      <p className="text-sm text-muted-foreground">
                        {setting.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {Object.keys(groupedSettings).length > 1 && (
                <Separator className="my-4" />
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
