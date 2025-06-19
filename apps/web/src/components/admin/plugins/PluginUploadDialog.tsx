"use client";

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button,
  Input,
  Label,
  Progress,
  Badge,
  Alert,
  AlertDescription,
} from "@/components/ui";
import {
  Upload,
  File,
  CheckCircle,
  AlertCircle,
  X,
  Download,
  Package,
} from "lucide-react";

interface UploadedFile {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  pluginInfo?: {
    name: string;
    version: string;
    description: string;
    author: string;
  };
}

export function PluginUploadDialog() {
  const [open, setOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(
      (file) =>
        file.name.endsWith(".zip") ||
        file.name.endsWith(".tar.gz") ||
        file.type === "application/zip" ||
        file.type === "application/x-gzip"
    );

    if (validFiles.length === 0) {
      alert("Please select valid plugin files (.zip or .tar.gz)");
      return;
    }

    const newFiles: UploadedFile[] = validFiles.map((file) => ({
      file,
      progress: 0,
      status: "pending",
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const uploadFile = async (fileData: UploadedFile, index: number) => {
    try {
      // Update status to uploading
      setUploadedFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, status: "uploading" } : f))
      );

      const formData = new FormData();
      formData.append("plugin", fileData.file);
      formData.append("overwrite", "false");
      formData.append("activate", "false");

      const response = await fetch("/api/admin/plugins/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      const result = await response.json();

      // Update status to success
      setUploadedFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                status: "success",
                progress: 100,
                pluginInfo: result.plugin,
              }
            : f
        )
      );
    } catch (error) {
      console.error("Upload error:", error);
      setUploadedFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                status: "error",
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : f
        )
      );
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAll = async () => {
    const pendingFiles = uploadedFiles
      .map((file, index) => ({ file, index }))
      .filter(({ file }) => file.status === "pending");

    for (const { file, index } of pendingFiles) {
      await uploadFile(file, index);
    }
  };

  const resetDialog = () => {
    setUploadedFiles([]);
    setOpen(false);
  };

  const allFilesProcessed =
    uploadedFiles.length > 0 &&
    uploadedFiles.every((f) => f.status === "success" || f.status === "error");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Upload Plugin
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Plugin</DialogTitle>
          <DialogDescription>
            Upload a plugin package (.zip or .tar.gz) to install it on your
            site.
          </DialogDescription>
        </DialogHeader>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <div className="space-y-2">
            <div className="text-lg font-medium">
              Drop plugin files here, or{" "}
              <button
                type="button"
                className="text-blue-600 hover:text-blue-700 underline"
                onClick={() => fileInputRef.current?.click()}
              >
                browse
              </button>
            </div>
            <div className="text-sm text-gray-600">
              Supports .zip and .tar.gz files up to 50MB
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".zip,.tar.gz,application/zip,application/x-gzip"
            multiple
            onChange={handleChange}
          />
        </div>

        {/* Upload Info */}
        <Alert>
          <Package className="h-4 w-4" />
          <AlertDescription>
            Plugin packages should contain a valid{" "}
            <code>plugin.config.json</code> file and compiled JavaScript in the{" "}
            <code>dist/</code> directory.
          </AlertDescription>
        </Alert>

        {/* File List */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">
                Files to Upload ({uploadedFiles.length})
              </h4>
              {!allFilesProcessed && (
                <Button onClick={uploadAll} size="sm">
                  Upload All
                </Button>
              )}
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {uploadedFiles.map((fileData, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <File className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium truncate">
                        {fileData.file.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {(fileData.file.size / 1024 / 1024).toFixed(1)} MB
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-2">
                      {fileData.status === "success" && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      {fileData.status === "error" && (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <button
                        onClick={() => removeFile(index)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {fileData.status === "uploading" && (
                    <Progress value={fileData.progress} className="mb-2" />
                  )}

                  {fileData.status === "error" && fileData.error && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {fileData.error}
                    </div>
                  )}

                  {fileData.status === "success" && fileData.pluginInfo && (
                    <div className="text-sm bg-green-50 p-2 rounded space-y-1">
                      <div className="font-medium text-green-800">
                        {fileData.pluginInfo.name} v
                        {fileData.pluginInfo.version}
                      </div>
                      <div className="text-green-700">
                        by {fileData.pluginInfo.author}
                      </div>
                      <div className="text-green-600">
                        {fileData.pluginInfo.description}
                      </div>
                    </div>
                  )}

                  {fileData.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => uploadFile(fileData, index)}
                    >
                      Upload
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={resetDialog}>
            {allFilesProcessed ? "Done" : "Cancel"}
          </Button>
          {allFilesProcessed && (
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
