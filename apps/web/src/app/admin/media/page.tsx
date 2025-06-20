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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  type: "image" | "video" | "audio" | "document" | "archive" | "other";
  mimeType: string;
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
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

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// API Configuration
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

// API Service Class
class MediaApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async fetchFiles(params?: {
    search?: string;
    type?: string;
    folder?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{ files: MediaFile[]; total: number }>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.append("search", params.search);
      if (params?.type && params.type !== "all")
        queryParams.append("type", params.type);
      if (params?.folder && params.folder !== "all")
        queryParams.append("folder", params.folder);
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.offset)
        queryParams.append("offset", params.offset.toString());

      const response = await fetch(`${this.baseUrl}/media?${queryParams}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch files");
      }

      return data;
    } catch (error) {
      console.error("API Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async uploadFile(
    file: File,
    metadata?: {
      folder?: string;
      tags?: string[];
      alt?: string;
      caption?: string;
    }
  ): Promise<ApiResponse<MediaFile>> {
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (metadata?.folder) formData.append("folder", metadata.folder);
      if (metadata?.tags)
        formData.append("tags", JSON.stringify(metadata.tags));
      if (metadata?.alt) formData.append("alt", metadata.alt);
      if (metadata?.caption) formData.append("caption", metadata.caption);

      const response = await fetch(`${this.baseUrl}/media/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      return data;
    } catch (error) {
      console.error("Upload Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  async updateFile(
    id: string,
    updates: Partial<MediaFile>
  ): Promise<ApiResponse<MediaFile>> {
    try {
      const response = await fetch(`${this.baseUrl}/media/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Update failed");
      }

      return data;
    } catch (error) {
      console.error("Update Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Update failed",
      };
    }
  }

  async deleteFile(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    try {
      const response = await fetch(`${this.baseUrl}/media/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Delete failed");
      }

      return data;
    } catch (error) {
      console.error("Delete Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Delete failed",
      };
    }
  }

  async toggleStar(id: string): Promise<ApiResponse<MediaFile>> {
    try {
      const response = await fetch(`${this.baseUrl}/media/${id}/star`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to toggle star");
      }

      return data;
    } catch (error) {
      console.error("Star Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Star toggle failed",
      };
    }
  }

  async incrementDownload(
    id: string
  ): Promise<ApiResponse<{ downloadCount: number }>> {
    try {
      const response = await fetch(`${this.baseUrl}/media/${id}/download`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to track download");
      }

      return data;
    } catch (error) {
      console.error("Download tracking error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Download tracking failed",
      };
    }
  }

  async getFolders(): Promise<ApiResponse<string[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/media/folders`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch folders");
      }

      return data;
    } catch (error) {
      console.error("Folders Error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch folders",
      };
    }
  }
}

const ALLOWED_FILE_TYPES = {
  image: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ],
  video: ["video/mp4", "video/webm", "video/mov", "video/avi"],
  audio: ["audio/mp3", "audio/wav", "audio/ogg", "audio/aac"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ],
  archive: [
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
  ],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function getFileType(mimeType: string): MediaFile["type"] {
  for (const [type, mimes] of Object.entries(ALLOWED_FILE_TYPES)) {
    if (mimes.includes(mimeType)) {
      return type as MediaFile["type"];
    }
  }
  return "other";
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(type: MediaFile["type"], className = "h-4 w-4") {
  switch (type) {
    case "image":
      return <ImageIcon className={className} />;
    case "video":
      return <Video className={className} />;
    case "audio":
      return <Music className={className} />;
    case "document":
      return <FileText className={className} />;
    case "archive":
      return <Archive className={className} />;
    default:
      return <FileText className={className} />;
  }
}

export default function MediaLibraryWithAPI() {
  // Initialize API service
  const apiService = new MediaApiService();

  // State management
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and search
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [folderFilter, setFolderFilter] = useState("all");
  const [currentView, setCurrentView] = useState<"grid" | "list">("grid");

  // Dialogs and modals
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<MediaFile | null>(null);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    originalName: "",
    alt: "",
    caption: "",
    tags: "",
    folder: "",
  });

  // Load files and folders on component mount
  useEffect(() => {
    loadFiles();
    loadFolders();
  }, []);

  // Reload files when filters change
  useEffect(() => {
    loadFiles();
  }, [searchTerm, typeFilter, folderFilter]);

  const loadFiles = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.fetchFiles({
        search: searchTerm || undefined,
        type: typeFilter,
        folder: folderFilter,
      });

      if (response.success && response.data) {
        setFiles(response.data.files);
      } else {
        setError(response.error || "Failed to load files");
        // Demo fallback - remove this in production
        setFiles([]);
      }
    } catch (err) {
      setError("Failed to connect to server");
      console.error("Load files error:", err);
      // Demo fallback - remove this in production
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      const response = await apiService.getFolders();
      if (response.success && response.data) {
        setFolders(response.data);
      }
    } catch (err) {
      console.error("Load folders error:", err);
    }
  };

  const handleFileUpload = async (fileList: FileList | File[]) => {
    const filesToUpload = Array.from(fileList);

    // Validate files
    const validFiles = filesToUpload.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        alert(
          `File ${file.name} is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`
        );
        return false;
      }

      const allowedTypes = Object.values(ALLOWED_FILE_TYPES).flat();
      if (!allowedTypes.includes(file.type)) {
        alert(`File type ${file.type} is not supported for ${file.name}`);
        return false;
      }

      return true;
    });

    // Upload files
    for (const file of validFiles) {
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    const uploadId = Math.random().toString(36).substr(2, 9);

    // Add to upload progress
    const uploadProgress: UploadProgress = {
      file,
      progress: 0,
      status: "uploading",
      id: uploadId,
    };

    setUploads((prev) => [...prev, uploadProgress]);

    try {
      // Update progress to show uploading
      setUploads((prev) =>
        prev.map((upload) =>
          upload.id === uploadId
            ? { ...upload, progress: 20, status: "uploading" }
            : upload
        )
      );

      // Make actual API call
      const response = await apiService.uploadFile(file, {
        folder: "uploads",
        tags: [],
      });

      if (response.success && response.data) {
        // Success - update progress
        setUploads((prev) =>
          prev.map((upload) =>
            upload.id === uploadId
              ? { ...upload, progress: 100, status: "complete" }
              : upload
          )
        );

        // Add new file to the list
        setFiles((prev) => [response.data!, ...prev]);

        // Remove from uploads after delay
        setTimeout(() => {
          setUploads((prev) => prev.filter((upload) => upload.id !== uploadId));
        }, 2000);
      } else {
        // Error
        setUploads((prev) =>
          prev.map((upload) =>
            upload.id === uploadId
              ? {
                  ...upload,
                  status: "error",
                  error: response.error || "Upload failed",
                }
              : upload
          )
        );
      }
    } catch (error) {
      setUploads((prev) =>
        prev.map((upload) =>
          upload.id === uploadId
            ? { ...upload, status: "error", error: "Network error" }
            : upload
        )
      );
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFileUpload(droppedFiles);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(e.target.files);
    }
  };

  const openEditDialog = (file: MediaFile) => {
    setSelectedFile(file);
    setEditForm({
      originalName: file.originalName,
      alt: file.alt || "",
      caption: file.caption || "",
      tags: file.tags.join(", "),
      folder: file.folder || "",
    });
    setEditDialog(true);
  };

  const saveFileEdit = async () => {
    if (!selectedFile) return;

    try {
      const updates = {
        originalName: editForm.originalName,
        alt: editForm.alt || undefined,
        caption: editForm.caption || undefined,
        tags: editForm.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        folder: editForm.folder || undefined,
      };

      const response = await apiService.updateFile(selectedFile.id, updates);

      if (response.success && response.data) {
        setFiles((prev) =>
          prev.map((file) =>
            file.id === selectedFile.id ? response.data! : file
          )
        );
        setEditDialog(false);
        setSelectedFile(null);
      } else {
        alert(response.error || "Failed to update file");
      }
    } catch (error) {
      alert("Failed to update file");
      console.error("Update error:", error);
    }
  };

  const deleteFile = async (fileToDelete: MediaFile) => {
    try {
      const response = await apiService.deleteFile(fileToDelete.id);

      if (response.success) {
        setFiles((prev) => prev.filter((file) => file.id !== fileToDelete.id));
      } else {
        alert(response.error || "Failed to delete file");
      }
    } catch (error) {
      alert("Failed to delete file");
      console.error("Delete error:", error);
    } finally {
      setDeleteDialog(null);
    }
  };

  const toggleStar = async (file: MediaFile) => {
    try {
      const response = await apiService.toggleStar(file.id);

      if (response.success && response.data) {
        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? response.data! : f))
        );
      }
    } catch (error) {
      console.error("Star toggle error:", error);
    }
  };

  const downloadFile = async (file: MediaFile) => {
    try {
      // Track download
      await apiService.incrementDownload(file.id);

      // Trigger download
      const link = document.createElement("a");
      link.href = file.url;
      link.download = file.originalName;
      link.target = "_blank";
      link.click();

      // Update local state
      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, downloadCount: f.downloadCount + 1 } : f
        )
      );
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  const copyUrl = async (file: MediaFile) => {
    try {
      await navigator.clipboard.writeText(file.url);
      // Show success toast (implement toast notifications)
      console.log("URL copied to clipboard");
    } catch (err) {
      console.error("Failed to copy URL");
    }
  };

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* API Status Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <h3 className="font-medium text-blue-900">
                API Integration Ready
              </h3>
              <p className="text-sm text-blue-700">
                This component is configured to work with a REST API.
                {error ? (
                  <span className="text-red-600 font-medium">
                    {" "}
                    Server connection failed - showing demo mode.
                  </span>
                ) : (
                  <span className="text-green-600 font-medium">
                    {" "}
                    Connected to API endpoint.
                  </span>
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadFiles}
              disabled={loading}
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Media Library
              </h1>
              <p className="text-gray-600">
                Production-ready with REST API integration • {files.length}{" "}
                files • {formatFileSize(totalSize)} total
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Select Files
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
                onClick={() => setUploadDialog(true)}
              >
                <CloudIcon className="h-4 w-4 mr-2" />
                Upload Area
              </Button>
            </div>
          </div>

          {/* Upload Progress */}
          {uploads.length > 0 && (
            <div className="mb-4 space-y-2">
              <h3 className="font-medium text-sm">Uploading files...</h3>
              {uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {upload.file.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {upload.status === "complete" && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {upload.status === "error" && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        {upload.status === "uploading" && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        {upload.status === "processing" && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                      </span>
                    </div>
                    <Progress value={upload.progress} className="h-1" />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{upload.error || upload.status}</span>
                      <span>{Math.round(upload.progress)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadFiles}
                  className="ml-auto border-red-300 text-red-700 hover:bg-red-100"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search files, tags..."
                  className="pl-10 border-gray-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue />
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

              <Select value={folderFilter} onValueChange={setFolderFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Folders</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder} value={folder}>
                      {folder.charAt(0).toUpperCase() + folder.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={currentView === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentView("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={currentView === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentView("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl shadow-sm p-12 border">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Loading files...</p>
            </div>
          </div>
        )}

        {/* Files Display */}
        {!loading && (
          <div className="bg-white rounded-xl shadow-sm p-6 border">
            {files.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <ImageIcon className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No files found
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || typeFilter !== "all" || folderFilter !== "all"
                    ? "Try adjusting your search criteria"
                    : "Upload your first file to get started"}
                </p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
              </div>
            ) : currentView === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {files.map((file) => (
                  <Card
                    key={file.id}
                    className="group overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300"
                  >
                    <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
                      {file.type === "image" && file.thumbnailUrl ? (
                        <img
                          src={file.thumbnailUrl}
                          alt={file.alt || file.filename}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-gray-500 p-4">
                          {getFileIcon(file.type, "h-8 w-8")}
                          <span className="text-xs text-center font-medium leading-tight">
                            {file.originalName}
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                        <div className="flex gap-1 w-full justify-center">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                            onClick={() => window.open(file.url, "_blank")}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                            onClick={() => openEditDialog(file)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => copyUrl(file)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy URL
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => downloadFile(file)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => toggleStar(file)}
                              >
                                {file.starred ? (
                                  <StarOff className="h-4 w-4 mr-2" />
                                ) : (
                                  <Star className="h-4 w-4 mr-2" />
                                )}
                                {file.starred
                                  ? "Remove from favorites"
                                  : "Add to favorites"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteDialog(file)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="absolute top-2 left-2">
                        <Badge
                          variant="secondary"
                          className="text-xs bg-white/90 backdrop-blur-sm"
                        >
                          {file.type}
                        </Badge>
                      </div>

                      {file.starred && (
                        <div className="absolute top-2 right-2">
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
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <Card
                    key={file.id}
                    className={`hover:shadow-md transition-all duration-200 border-l-4 ${
                      file.starred
                        ? "border-l-yellow-400"
                        : "border-l-transparent"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="relative h-16 w-16 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden">
                          {file.type === "image" && file.thumbnailUrl ? (
                            <img
                              src={file.thumbnailUrl}
                              alt={file.alt || file.filename}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              {getFileIcon(file.type, "h-6 w-6 text-gray-600")}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-semibold truncate text-gray-900">
                              {file.originalName}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {file.type}
                            </Badge>
                            {file.starred && (
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            )}
                          </div>
                          <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            <span>{formatFileSize(file.size)}</span>
                            {file.dimensions && (
                              <span>
                                {file.dimensions.width}×{file.dimensions.height}
                              </span>
                            )}
                            <span>
                              {new Date(file.uploadedAt).toLocaleDateString()}
                            </span>
                            <span>{file.uploadedBy}</span>
                            <span>Downloads: {file.downloadCount}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(file.url, "_blank")}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(file)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => copyUrl(file)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy URL
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => downloadFile(file)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => toggleStar(file)}
                              >
                                {file.starred ? (
                                  <StarOff className="h-4 w-4 mr-2" />
                                ) : (
                                  <Star className="h-4 w-4 mr-2" />
                                )}
                                {file.starred
                                  ? "Remove from favorites"
                                  : "Add to favorites"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteDialog(file)}
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
            )}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInput}
          accept={Object.values(ALLOWED_FILE_TYPES).flat().join(",")}
        />

        {/* Upload Dialog */}
        <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Files</DialogTitle>
              <DialogDescription>
                Drag and drop files here or click to select files
              </DialogDescription>
            </DialogHeader>

            <div
              ref={dropZoneRef}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
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
                Supports images, videos, audio, documents, and archives up to{" "}
                {formatFileSize(MAX_FILE_SIZE)}
              </p>
              <Button>Select Files</Button>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p>
                <strong>Supported formats:</strong>
              </p>
              <p>Images: JPEG, PNG, GIF, WebP, SVG</p>
              <p>Videos: MP4, WebM, MOV, AVI</p>
              <p>Audio: MP3, WAV, OGG, AAC</p>
              <p>Documents: PDF, DOC, DOCX, TXT</p>
              <p>Archives: ZIP, RAR, 7Z</p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit File Details</DialogTitle>
              <DialogDescription>
                Update the metadata and information for this file
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="filename">File Name</Label>
                <Input
                  id="filename"
                  value={editForm.originalName}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      originalName: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="alt">Alt Text (for images)</Label>
                <Input
                  id="alt"
                  value={editForm.alt}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, alt: e.target.value }))
                  }
                  placeholder="Describe the image for accessibility"
                />
              </div>

              <div>
                <Label htmlFor="caption">Caption</Label>
                <Textarea
                  id="caption"
                  value={editForm.caption}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      caption: e.target.value,
                    }))
                  }
                  placeholder="Add a caption or description"
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={editForm.tags}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, tags: e.target.value }))
                  }
                  placeholder="Comma-separated tags"
                />
              </div>

              <div>
                <Label htmlFor="folder">Folder</Label>
                <Input
                  id="folder"
                  value={editForm.folder}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, folder: e.target.value }))
                  }
                  placeholder="Folder name"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveFileEdit}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog
          open={!!deleteDialog}
          onOpenChange={() => setDeleteDialog(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete File</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteDialog?.originalName}"?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteDialog && deleteFile(deleteDialog)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
