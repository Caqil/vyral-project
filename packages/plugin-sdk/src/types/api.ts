import { PluginAPI } from './plugin';

export * from './plugin';

// Extended API types for plugin SDK

export interface PluginAPIExtended extends PluginAPI {
  // Authentication & Security
  auth: {
    getCurrentUser(): Promise<User | null>;
    validateToken(token: string): Promise<boolean>;
    generateToken(userId: string, expiresIn?: number): Promise<string>;
    hashPassword(password: string): Promise<string>;
    verifyPassword(password: string, hash: string): Promise<boolean>;
    createSession(userId: string, metadata?: any): Promise<string>;
    destroySession(sessionId: string): Promise<void>;
  };

  // Content Management
  content: {
    createPost(data: CreatePostData): Promise<Post>;
    updatePost(id: string, data: Partial<UpdatePostData>): Promise<Post>;
    deletePost(id: string): Promise<boolean>;
    publishPost(id: string): Promise<Post>;
    unpublishPost(id: string): Promise<Post>;
    schedulePost(id: string, publishAt: Date): Promise<Post>;
    getDrafts(userId?: string): Promise<Post[]>;
    getPublished(options?: ContentQueryOptions): Promise<PaginatedResult<Post>>;
    searchContent(query: string, options?: SearchOptions): Promise<SearchResult<Post>>;
    bulkUpdate(ids: string[], updates: Partial<UpdatePostData>): Promise<BulkOperationResult>;
  };

  // Media Management
  media: {
    upload(file: File | Buffer, metadata?: MediaMetadata): Promise<MediaFile>;
    delete(id: string): Promise<boolean>;
    getById(id: string): Promise<MediaFile | null>;
    getByType(type: MediaType): Promise<MediaFile[]>;
    resize(id: string, dimensions: ImageDimensions): Promise<MediaFile>;
    optimize(id: string, options?: OptimizationOptions): Promise<MediaFile>;
    generateThumbnail(id: string, size?: ThumbnailSize): Promise<MediaFile>;
    getUsage(id: string): Promise<MediaUsage>;
  };

  // User Management
  users: {
    create(userData: CreateUserData): Promise<User>;
    update(id: string, updates: Partial<UpdateUserData>): Promise<User>;
    delete(id: string): Promise<boolean>;
    activate(id: string): Promise<User>;
    deactivate(id: string): Promise<User>;
    changePassword(id: string, newPassword: string): Promise<boolean>;
    assignRole(userId: string, roleId: string): Promise<void>;
    removeRole(userId: string, roleId: string): Promise<void>;
    getByRole(roleId: string): Promise<User[]>;
    search(query: string, options?: UserSearchOptions): Promise<SearchResult<User>>;
  };

  // Analytics & Metrics
  analytics: {
    trackEvent(event: AnalyticsEvent): Promise<void>;
    getMetrics(type: MetricType, timeRange: TimeRange): Promise<Metric[]>;
    getPageViews(postId?: string, timeRange?: TimeRange): Promise<PageViewData[]>;
    getUserActivity(userId: string, timeRange?: TimeRange): Promise<UserActivity[]>;
    generateReport(type: ReportType, options?: ReportOptions): Promise<Report>;
  };

  // Notifications
  notifications: {
    send(notification: NotificationData): Promise<string>;
    sendBulk(notifications: NotificationData[]): Promise<BulkOperationResult>;
    getByUser(userId: string, options?: NotificationQueryOptions): Promise<PaginatedResult<Notification>>;
    markAsRead(id: string): Promise<void>;
    markAllAsRead(userId: string): Promise<void>;
    subscribe(userId: string, topic: string): Promise<void>;
    unsubscribe(userId: string, topic: string): Promise<void>;
  };

  // Search & Indexing
  search: {
    index(document: SearchDocument): Promise<void>;
    bulkIndex(documents: SearchDocument[]): Promise<BulkOperationResult>;
    query(query: SearchQuery): Promise<SearchResult<any>>;
    suggest(input: string, type?: string): Promise<SearchSuggestion[]>;
    reindex(type?: string): Promise<void>;
    deleteIndex(documentId: string): Promise<void>;
  };

  // File System (Server-side)
  filesystem: {
    exists(path: string): Promise<boolean>;
    mkdir(path: string, recursive?: boolean): Promise<void>;
    readdir(path: string): Promise<string[]>;
    stat(path: string): Promise<FileStats>;
    copy(src: string, dest: string): Promise<void>;
    move(src: string, dest: string): Promise<void>;
    createReadStream(path: string): Promise<ReadableStream>;
    createWriteStream(path: string): Promise<WritableStream>;
  };

  // Email Services
  email: {
    send(email: EmailData): Promise<string>;
    sendTemplate(templateId: string, data: any, recipients: string[]): Promise<string>;
    createTemplate(template: EmailTemplate): Promise<string>;
    updateTemplate(id: string, updates: Partial<EmailTemplate>): Promise<void>;
    deleteTemplate(id: string): Promise<void>;
    getTemplates(): Promise<EmailTemplate[]>;
    trackDelivery(messageId: string): Promise<EmailDeliveryStatus>;
  };

  // Background Jobs
  jobs: {
    create(jobData: JobData): Promise<string>;
    schedule(jobData: JobData, schedule: CronSchedule): Promise<string>;
    cancel(jobId: string): Promise<boolean>;
    retry(jobId: string): Promise<boolean>;
    getStatus(jobId: string): Promise<JobStatus>;
    getQueue(queueName?: string): Promise<QueueInfo>;
    pauseQueue(queueName: string): Promise<void>;
    resumeQueue(queueName: string): Promise<void>;
  };
}

// Data Transfer Objects
export interface CreatePostData {
  title: string;
  content: string;
  excerpt?: string;
  slug?: string;
  categoryId?: string;
  tags?: string[];
  status?: PostStatus;
  metadata?: Record<string, any>;
  publishAt?: Date;
  authorId?: string;
}

export interface UpdatePostData extends Partial<CreatePostData> {
  updatedAt?: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  roles?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateUserData extends Partial<CreateUserData> {
  active?: boolean;
  lastLoginAt?: Date;
}

export interface MediaMetadata {
  alt?: string;
  caption?: string;
  description?: string;
  tags?: string[];
  author?: string;
}

export interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
  metadata: MediaMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImageDimensions {
  width: number;
  height: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface OptimizationOptions {
  quality?: number;
  format?: string;
  progressive?: boolean;
  lossless?: boolean;
}

export enum ThumbnailSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large'
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  ARCHIVE = 'archive'
}

export interface MediaUsage {
  totalPosts: number;
  posts: Array<{ id: string; title: string; }>;
  totalViews: number;
  lastUsedAt: Date;
}

// Query and Pagination Types
export interface ContentQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  categoryId?: string;
  authorId?: string;
  status?: PostStatus;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
  facets?: string[];
  highlight?: boolean;
}

export interface SearchResult<T> {
  results: T[];
  total: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
  suggestions?: string[];
  searchTime: number;
}

export interface UserSearchOptions {
  limit?: number;
  offset?: number;
  role?: string;
  active?: boolean;
  sortBy?: 'name' | 'email' | 'createdAt' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}

// Analytics Types
export interface AnalyticsEvent {
  type: string;
  userId?: string;
  sessionId?: string;
  data?: Record<string, any>;
  timestamp?: Date;
  ip?: string;
  userAgent?: string;
}

export enum MetricType {
  PAGE_VIEWS = 'page_views',
  UNIQUE_VISITORS = 'unique_visitors',
  BOUNCE_RATE = 'bounce_rate',
  SESSION_DURATION = 'session_duration',
  CONVERSION_RATE = 'conversion_rate'
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface Metric {
  type: MetricType;
  value: number;
  timestamp: Date;
  dimensions?: Record<string, string>;
}

export interface PageViewData {
  postId?: string;
  postTitle?: string;
  views: number;
  uniqueViews: number;
  date: Date;
}

export interface UserActivity {
  userId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export enum ReportType {
  TRAFFIC = 'traffic',
  CONTENT_PERFORMANCE = 'content_performance',
  USER_ENGAGEMENT = 'user_engagement',
  REVENUE = 'revenue'
}

export interface ReportOptions {
  timeRange: TimeRange;
  groupBy?: 'day' | 'week' | 'month';
  filters?: Record<string, any>;
  format?: 'json' | 'csv' | 'pdf';
}

export interface Report {
  type: ReportType;
  data: any[];
  summary: Record<string, any>;
  generatedAt: Date;
  options: ReportOptions;
}

// Notification Types
export interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  actionUrl?: string;
  metadata?: Record<string, any>;
  scheduledFor?: Date;
}

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error'
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  readAt?: Date;
}

export interface NotificationQueryOptions {
  limit?: number;
  offset?: number;
  read?: boolean;
  type?: NotificationType;
  sortBy?: 'createdAt' | 'readAt';
  sortOrder?: 'asc' | 'desc';
}

// Search and Indexing Types
export interface SearchDocument {
  id: string;
  type: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  tags?: string[];
  categoryId?: string;
  authorId?: string;
  publishedAt?: Date;
}

export interface SearchQuery {
  q: string;
  type?: string;
  filters?: Record<string, any>;
  facets?: string[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  highlight?: boolean;
}

export interface SearchSuggestion {
  text: string;
  score: number;
  type?: string;
}

// File System Types
export interface FileStats {
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  createdAt: Date;
  modifiedAt: Date;
  accessedAt: Date;
}

// Email Types
export interface EmailData {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
  templateId?: string;
  templateData?: Record<string, any>;
}

export interface EmailTemplate {
  id?: string;
  name: string;
  subject: string;
  text?: string;
  html?: string;
  variables?: EmailVariable[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EmailVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  required: boolean;
  defaultValue?: any;
  description?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  cid?: string;
}

export enum EmailDeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  COMPLAINED = 'complained'
}

// Job System Types
export interface JobData {
  name: string;
  data: any;
  queue?: string;
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: BackoffOptions;
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
}

export interface BackoffOptions {
  type: 'fixed' | 'exponential';
  delay: number;
}

export interface CronSchedule {
  pattern: string;
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
}

export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused'
}

export interface QueueInfo {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

// Operation Results
export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

// Base Types Extensions
export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  SCHEDULED = 'scheduled',
  ARCHIVED = 'archived'
}

export interface Post {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  status: PostStatus;
  categoryId?: string;
  tags: string[];
  authorId: string;
  metadata: Record<string, any>;
  publishedAt?: Date;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  active: boolean;
  metadata: Record<string, any>;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}