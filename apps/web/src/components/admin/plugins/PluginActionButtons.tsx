"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui";
import { Power, PowerOff, Trash2, Download, AlertTriangle } from "lucide-react";

interface Plugin {
  id: string;
  name: string;
  status: string;
  isCore?: boolean;
  hasUpdate?: boolean;
  newVersion?: string;
}

interface PluginActionButtonsProps {
  plugin: Plugin;
}

export function PluginActionButtons({ plugin }: PluginActionButtonsProps) {
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/plugins/${plugin.id}/activate`, {
        method: "POST",
      });

      if (response.ok) {
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.message || "Failed to activate plugin");
      }
    } catch (error) {
      console.error("Activation error:", error);
      alert("Failed to activate plugin");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm(`Are you sure you want to deactivate ${plugin.name}?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/plugins/${plugin.id}/deactivate`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.message || "Failed to deactivate plugin");
      }
    } catch (error) {
      console.error("Deactivation error:", error);
      alert("Failed to deactivate plugin");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ${plugin.name}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/plugins/${plugin.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.message || "Failed to delete plugin");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete plugin");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/plugins/${plugin.id}/update`, {
        method: "POST",
      });

      if (response.ok) {
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.message || "Failed to update plugin");
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("Failed to update plugin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex space-x-2">
      {plugin.hasUpdate && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleUpdate}
          disabled={loading}
          className="text-blue-600 hover:text-blue-700"
        >
          <Download className="h-3 w-3 mr-1" />
          Update
        </Button>
      )}

      {plugin.status === "activated" ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeactivate}
          disabled={plugin.isCore || loading}
          className="text-red-600 hover:text-red-700"
        >
          <PowerOff className="h-3 w-3 mr-1" />
          Deactivate
        </Button>
      ) : plugin.status === "loaded" || plugin.status === "deactivated" ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleActivate}
          disabled={loading}
          className="text-green-600 hover:text-green-700"
        >
          <Power className="h-3 w-3 mr-1" />
          Activate
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled className="text-gray-400">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Error
        </Button>
      )}

      {!plugin.isCore && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={loading}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
