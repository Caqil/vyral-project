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
  Filter,
  SortAsc,
  Layout,
  Image as ImageLucide,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Enhanced interfaces
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

// Enhanced API helper functions
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
};

export default function MediaLibraryPage() {
  // State management
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedFolder, setSelectedFolder] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("uploadedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Upload states
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Selection states
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load files function
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
        let sortedFiles = response.data.files || [];

        // Sort files
        sortedFiles.sort((a: MediaFile, b: MediaFile) => {
          const aValue = a[sortBy as keyof MediaFile] ?? "";
          const bValue = b[sortBy as keyof MediaFile] ?? "";

          if (sortOrder === "asc") {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
        });

        setFiles(sortedFiles);
      } else {
        setError(response.error || "Failed to load files");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
      console.error("Load files error:", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedType, selectedFolder, sortBy, sortOrder]);

  // File upload handler
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
        setUploadProgress((prev) =>
          prev.map((p) => (p.id === upload.id ? { ...p, progress: 50 } : p))
        );

        const response = await mediaApi.uploadFile(upload.file, {
          alt: "",
          caption: "",
          tags: [],
        });

        if (response.success) {
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

    setTimeout(() => {
      loadFiles();
      setUploadDialog(false);
      setUploadProgress([]);
    }, 2000);
  };

  // Delete file handler
  const handleDelete = async (fileId: string) => {
    try {
      const response = await mediaApi.deleteFile(fileId);
      if (response.success) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        setSelectedFiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
      } else {
        setError(response.error || "Delete failed");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Delete failed");
    }
  };

  // Star/unstar file handler
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

  // File selection handlers
  const handleFileSelect = (fileId: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map((f) => f.id)));
    }
    setSelectAll(!selectAll);
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

  // Utility functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (type: string, mimeType: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-6 w-6 text-blue-500" />;
      case "video":
        return <Video className="h-6 w-6 text-purple-500" />;
      case "audio":
        return <Music className="h-6 w-6 text-green-500" />;
      case "document":
        return <FileText className="h-6 w-6 text-orange-500" />;
      case "archive":
        return <Archive className="h-6 w-6 text-gray-500" />;
      default:
        return <FileText className="h-6 w-6 text-gray-400" />;
    }
  };

  const renderFileThumbnail = (file: MediaFile) => {
    if (file.type === "image") {
      return (
        <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={file.thumbnailUrl || file.url}
            alt={file.alt || file.originalName}
            className="w-full h-full object-cover transition-transform hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              target.nextElementSibling?.classList.remove("hidden");
            }}
          />
          <div className="hidden w-full h-full flex items-center justify-center bg-gray-100">
            {getFileIcon(file.type, file.mimeType)}
          </div>
        </div>
      );
    } else {
      return (
        <div className="w-full h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
          {getFileIcon(file.type, file.mimeType)}
        </div>
      );
    }
  };

  // Load files on mount and when filters change
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  return (
    <TooltipProvider>
      <div
        className="min-h-screen bg-gray-50/30 p-6 space-y-6"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Enhanced Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Media Library
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your files, images, and documents with professional tools
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setViewMode(viewMode === "grid" ? "list" : "grid")
                }
              >
                {viewMode === "grid" ? (
                  <List className="h-4 w-4" />
                ) : (
                  <Grid3X3 className="h-4 w-4" />
                )}
              </Button>
              <Button
                onClick={() => setUploadDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
            </div>
          </div>

          {/* Enhanced Filters and Controls */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search files by name, tags, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* File Type Filter */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Types" />
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

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SortAsc className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uploadedAt">Upload Date</SelectItem>
                <SelectItem value="filename">Name</SelectItem>
                <SelectItem value="size">Size</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Order */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </Button>

            {/* Bulk Actions */}
            {selectedFiles.size > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <Badge variant="secondary">{selectedFiles.size} selected</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFiles(new Set())}
                >
                  Clear
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Actions <MoreVertical className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>

        {/* Drag and Drop Overlay */}
        {isDragOver && (
          <div className="fixed inset-0 bg-blue-500/20 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-8 shadow-lg border-2 border-dashed border-blue-500">
              <Upload className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">
                Drop files here to upload
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span className="text-gray-600">Loading media files...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-red-700">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={loadFiles}
                className="ml-auto"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Files Grid/List */}
        {!loading && files.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            {/* Select All */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">
                  {files.length} files (
                  {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}{" "}
                  total)
                </span>
              </div>
            </div>

            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {files.map((file) => (
                  <Card
                    key={file.id}
                    className={`group hover:shadow-lg transition-all duration-200 cursor-pointer ${
                      selectedFiles.has(file.id)
                        ? "ring-2 ring-blue-500 bg-blue-50"
                        : ""
                    }`}
                    onClick={() => handleFileSelect(file.id)}
                  >
                    <CardContent className="p-3">
                      {/* Thumbnail */}
                      <div className="relative mb-3">
                        {renderFileThumbnail(file)}

                        {/* Overlay controls */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-8 w-8 p-0"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Preview</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-8 w-8 p-0"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Download</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        {/* Selection checkbox */}
                        <div className="absolute top-2 left-2">
                          <input
                            type="checkbox"
                            checked={selectedFiles.has(file.id)}
                            onChange={() => handleFileSelect(file.id)}
                            className="rounded border-gray-300 bg-white/90 backdrop-blur-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        {/* Star indicator */}
                        {file.starred && (
                          <div className="absolute top-2 right-2">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          </div>
                        )}
                      </div>

                      {/* File info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getFileIcon(file.type, file.mimeType)}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-sm font-medium truncate">
                                {file.originalName}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent>{file.originalName}</TooltipContent>
                          </Tooltip>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{formatFileSize(file.size)}</span>
                          {file.dimensions && (
                            <span>
                              {file.dimensions.width}×{file.dimensions.height}
                            </span>
                          )}
                        </div>

                        {/* Tags */}
                        {file.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {file.tags.slice(0, 2).map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {file.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{file.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStar(file.id);
                            }}
                            className="h-6 px-2"
                          >
                            {file.starred ? (
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            ) : (
                              <StarOff className="h-3 w-3" />
                            )}
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy URL
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(file.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              /* List View */
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center gap-4 p-3 rounded-lg border hover:bg-gray-50 transition-colors ${
                      selectedFiles.has(file.id)
                        ? "bg-blue-50 border-blue-200"
                        : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.id)}
                      onChange={() => handleFileSelect(file.id)}
                      className="rounded border-gray-300"
                    />

                    <div className="w-12 h-12 flex-shrink-0">
                      {file.type === "image" ? (
                        <img
                          src={file.thumbnailUrl || file.url}
                          alt={file.alt || file.originalName}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center">
                          {getFileIcon(file.type, file.mimeType)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {file.originalName}
                        </p>
                        {file.starred && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.size)} • {file.mimeType}
                        {file.dimensions &&
                          ` • ${file.dimensions.width}×${file.dimensions.height}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{file.type}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
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
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && files.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <HardDrive className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No files found
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || selectedType !== "all"
                ? "Try adjusting your search filters"
                : "Upload some files to get started"}
            </p>
            <Button
              onClick={() => setUploadDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
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
                Select or drag files to upload to your media library
              </DialogDescription>
            </DialogHeader>

            {uploadProgress.length > 0 ? (
              <div className="space-y-4">
                {uploadProgress.map((upload) => (
                  <div key={upload.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate">{upload.file.name}</span>
                      <span className="text-muted-foreground">
                        {upload.status === "complete"
                          ? "Complete"
                          : `${upload.progress}%`}
                      </span>
                    </div>
                    <Progress value={upload.progress} className="h-2" />
                    {upload.error && (
                      <p className="text-sm text-red-600">{upload.error}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Choose files or drag them here
                  </p>
                  <p className="text-gray-500">
                    Support for images, videos, documents, and more
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      handleFileUpload(e.target.files);
                    }
                  }}
                />

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setUploadDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Select Files
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
