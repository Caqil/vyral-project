"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  Search,
  Download,
  Trash2,
  Copy,
  FileText,
  ImageIcon,
  Video,
  Music,
  Archive,
  Grid3X3,
  List,
  MoreVertical,
  Eye,
  Edit,
  FolderOpen,
  Calendar,
  User,
  HardDrive,
  X,
  CheckCircle,
  AlertCircle,
  Star,
  StarOff,
  Plus,
  Save,
  RotateCcw,
  FileCheck,
  Loader2,
  RefreshCw,
  Database,
  CloudIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Simple interfaces for frontend
interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  type: "image" | "video" | "audio" | "document" | "archive" | "other";
  mimeType: string;
  size: number;
  dimensions?: { width: number; height: number };
  uploadedAt: string;
  uploadedBy: string;
  alt?: string;
  caption?: string;
  tags: string[];
  folder?: string;
  starred?: boolean;
  downloadCount: number;
  lastModified: string;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: "uploading" | "processing" | "complete" | "error";
  error?: string;
  id: string;
}

// Simple API helper functions (no class needed)
const mediaApi = {
  async fetchFiles(params?: {
    search?: string;
    type?: string;
    folder?: string;
    limit?: number;
    offset?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append("search", params.search);
    if (params?.type && params.type !== "all")
      queryParams.append("type", params.type);
    if (params?.folder && params.folder !== "all")
      queryParams.append("folder", params.folder);
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.offset) queryParams.append("offset", params.offset.toString());

    const response = await fetch(`/api/media?${queryParams}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },

  async uploadFile(
    file: File,
    metadata?: {
      folder?: string;
      tags?: string[];
      alt?: string;
      caption?: string;
    }
  ) {
    const formData = new FormData();
    formData.append("file", file);
    if (metadata?.folder) formData.append("folder", metadata.folder);
    if (metadata?.tags) formData.append("tags", JSON.stringify(metadata.tags));
    if (metadata?.alt) formData.append("alt", metadata.alt);
    if (metadata?.caption) formData.append("caption", metadata.caption);

    const response = await fetch("/api/media/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    return response.json();
  },

  async updateFile(id: string, updates: Partial<MediaFile>) {
    const response = await fetch(`/api/media/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },

  async deleteFile(id: string) {
    const response = await fetch(`/api/media/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },

  async bulkOperation(action: string, ids: string[], data?: any) {
    const response = await fetch("/api/media/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids, data }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },

  async searchFiles(query: string, filters?: any) {
    const queryParams = new URLSearchParams();
    queryParams.append("q", query);
    if (filters?.type) queryParams.append("type", filters.type);
    if (filters?.folder) queryParams.append("folder", filters.folder);
    if (filters?.limit) queryParams.append("limit", filters.limit.toString());

    const response = await fetch(`/api/media/search?${queryParams}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },

  async getStats() {
    const response = await fetch("/api/media/stats");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
};

export default function MediaPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedFolder, setSelectedFolder] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editingFile, setEditingFile] = useState<MediaFile | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load files
  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await mediaApi.fetchFiles({
        search: searchTerm || undefined,
        type: selectedType !== "all" ? selectedType : undefined,
        folder: selectedFolder !== "all" ? selectedFolder : undefined,
        limit: 50,
        offset: 0,
      });

      if (response.success) {
        setFiles(response.data.files || []);
      } else {
        setError(response.error || "Failed to load files");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
      console.error("Load files error:", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedType, selectedFolder]);

  // Upload files
  const handleFileUpload = async (selectedFiles: FileList) => {
    const uploads: UploadProgress[] = Array.from(selectedFiles).map((file) => ({
      file,
      progress: 0,
      status: "uploading" as const,
      id: Math.random().toString(36),
    }));

    setUploadProgress(uploads);
    setUploadDialog(true);

    for (const upload of uploads) {
      try {
        // Update progress to show uploading
        setUploadProgress((prev) =>
          prev.map((p) => (p.id === upload.id ? { ...p, progress: 50 } : p))
        );

        const response = await mediaApi.uploadFile(upload.file, {
          alt: "",
          caption: "",
          tags: [],
        });

        if (response.success) {
          // Update progress to complete
          setUploadProgress((prev) =>
            prev.map((p) =>
              p.id === upload.id
                ? { ...p, progress: 100, status: "complete" }
                : p
            )
          );
        } else {
          throw new Error(response.error || "Upload failed");
        }
      } catch (error) {
        console.error("Upload error:", error);
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.id === upload.id
              ? {
                  ...p,
                  status: "error",
                  error:
                    error instanceof Error ? error.message : "Upload failed",
                }
              : p
          )
        );
      }
    }

    // Reload files after upload
    setTimeout(() => {
      loadFiles();
      setUploadDialog(false);
      setUploadProgress([]);
    }, 2000);
  };

  // Delete file
  const handleDelete = async (fileId: string) => {
    try {
      const response = await mediaApi.deleteFile(fileId);
      if (response.success) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
      } else {
        setError(response.error || "Delete failed");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Delete failed");
    }
  };

  // Star/unstar file
  const handleToggleStar = async (fileId: string) => {
    try {
      const file = files.find((f) => f.id === fileId);
      if (!file) return;

      const response = await mediaApi.updateFile(fileId, {
        starred: !file.starred,
      });

      if (response.success) {
        setFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, starred: !f.starred } : f))
        );
      }
    } catch (error) {
      console.error("Toggle star error:", error);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Get file icon
  const getFileIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-8 w-8" />;
      case "video":
        return <Video className="h-8 w-8" />;
      case "audio":
        return <Music className="h-8 w-8" />;
      case "document":
        return <FileText className="h-8 w-8" />;
      case "archive":
        return <Archive className="h-8 w-8" />;
      default:
        return <FileText className="h-8 w-8" />;
    }
  };

  // Load files on mount and when filters change
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Media Library</h1>
          <p className="text-muted-foreground">
            Manage your files, images, and documents
          </p>
        </div>
        <Button onClick={() => setUploadDialog(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Files
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="File type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
            <SelectItem value="archive">Archives</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading files...</span>
        </div>
      )}

      {/* Files Grid/List */}
      {!loading && (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
              : "space-y-2"
          }
        >
          {files.map((file) => (
            <Card
              key={file.id}
              className="hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              {viewMode === "grid" ? (
                <>
                  <div className="relative aspect-video bg-muted/50 rounded-t-lg overflow-hidden">
                    {file.type === "image" && file.thumbnailUrl ? (
                      <img
                        src={file.thumbnailUrl}
                        alt={file.alt || file.originalName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        {getFileIcon(file.type)}
                      </div>
                    )}

                    <div className="absolute top-2 right-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => handleToggleStar(file.id)}
                          >
                            {file.starred ? (
                              <>
                                <StarOff className="h-4 w-4 mr-2" />
                                Remove from favorites
                              </>
                            ) : (
                              <>
                                <Star className="h-4 w-4 mr-2" />
                                Add to favorites
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(file.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="text-xs">
                        {file.type}
                      </Badge>
                    </div>

                    {file.starred && (
                      <div className="absolute top-2 right-12">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      </div>
                    )}
                  </div>

                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <p
                        className="text-sm font-medium truncate"
                        title={file.originalName}
                      >
                        {file.originalName}
                      </p>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        {file.dimensions && (
                          <span>
                            {file.dimensions.width}×{file.dimensions.height}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </>
              ) : (
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="text-muted-foreground">
                      {getFileIcon(file.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {file.originalName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)} • {file.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.starred && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => handleToggleStar(file.id)}
                          >
                            {file.starred ? (
                              <>
                                <StarOff className="h-4 w-4 mr-2" />
                                Remove from favorites
                              </>
                            ) : (
                              <>
                                <Star className="h-4 w-4 mr-2" />
                                Add to favorites
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(file.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && files.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <HardDrive className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No files found</h3>
          <p className="text-muted-foreground mb-4">
            Upload some files to get started
          </p>
          <Button onClick={() => setUploadDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Select files to upload to your media library
            </DialogDescription>
          </DialogHeader>

          {uploadProgress.length > 0 ? (
            <div className="space-y-4">
              {uploadProgress.map((upload) => (
                <div key={upload.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">
                      {upload.file.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {upload.status === "complete" && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {upload.status === "error" && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      {upload.status === "uploading" && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                    </div>
                  </div>
                  <Progress value={upload.progress} />
                  {upload.error && (
                    <p className="text-sm text-red-500">{upload.error}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files?.length) {
                    handleFileUpload(e.target.files);
                  }
                }}
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                className="hidden"
              />

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragOver
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <CloudIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium mb-2">
                  {isDragOver
                    ? "Drop files here"
                    : "Choose files or drag them here"}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Supports images, videos, audio, documents up to 10MB
                </p>
                <Button>Select Files</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
