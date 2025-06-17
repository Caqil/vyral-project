import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Save,
  Upload,
  Trash2,
  Eye,
  Globe,
  Users,
  Shield,
  Mail,
  Database,
  Server,
  Palette,
  Search,
  Zap,
  FileText,
} from "lucide-react";

interface Settings {
  general: {
    siteName: string;
    siteDescription: string;
    siteUrl: string;
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    weekStartsOn: string;
  };
  content: {
    postsPerPage: number;
    allowComments: boolean;
    moderateComments: boolean;
    requireLogin: boolean;
    defaultPostStatus: string;
    defaultCategory: string;
    enableRevisions: boolean;
    revisionsToKeep: number;
  };
  media: {
    maxFileSize: number;
    allowedFileTypes: string[];
    imageQuality: number;
    generateThumbnails: boolean;
    thumbnailSizes: Array<{ name: string; width: number; height: number }>;
  };
  seo: {
    enableSitemap: boolean;
    enableRobots: boolean;
    defaultMetaDescription: string;
    socialImage: string;
    googleAnalytics: string;
    googleSearchConsole: string;
  };
  security: {
    enableTwoFactor: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
    enableCaptcha: boolean;
    allowUserRegistration: boolean;
    defaultUserRole: string;
  };
  email: {
    provider: string;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    fromName: string;
    enableEmailNotifications: boolean;
  };
  performance: {
    enableCaching: boolean;
    cacheExpiration: number;
    enableCompression: boolean;
    enableCdn: boolean;
    cdnUrl: string;
    enableLazyLoading: boolean;
  };
}

async function getSettings(): Promise<Settings> {
  // Simulate API call - replace with actual settings service
  return {
    general: {
      siteName: "Vyral CMS",
      siteDescription: "Modern, plugin-based content management system",
      siteUrl: "https://vyral.com",
      language: "en",
      timezone: "America/New_York",
      dateFormat: "YYYY-MM-DD",
      timeFormat: "HH:mm",
      weekStartsOn: "monday",
    },
    content: {
      postsPerPage: 10,
      allowComments: true,
      moderateComments: true,
      requireLogin: false,
      defaultPostStatus: "draft",
      defaultCategory: "uncategorized",
      enableRevisions: true,
      revisionsToKeep: 10,
    },
    media: {
      maxFileSize: 10,
      allowedFileTypes: ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx"],
      imageQuality: 85,
      generateThumbnails: true,
      thumbnailSizes: [
        { name: "thumbnail", width: 150, height: 150 },
        { name: "medium", width: 300, height: 300 },
        { name: "large", width: 800, height: 600 },
      ],
    },
    seo: {
      enableSitemap: true,
      enableRobots: true,
      defaultMetaDescription: "Powered by Vyral CMS",
      socialImage: "",
      googleAnalytics: "",
      googleSearchConsole: "",
    },
    security: {
      enableTwoFactor: false,
      sessionTimeout: 24,
      maxLoginAttempts: 5,
      enableCaptcha: false,
      allowUserRegistration: true,
      defaultUserRole: "subscriber",
    },
    email: {
      provider: "smtp",
      smtpHost: "",
      smtpPort: 587,
      smtpUser: "",
      smtpPassword: "",
      fromEmail: "noreply@vyral.com",
      fromName: "Vyral CMS",
      enableEmailNotifications: true,
    },
    performance: {
      enableCaching: true,
      cacheExpiration: 3600,
      enableCompression: true,
      enableCdn: false,
      cdnUrl: "",
      enableLazyLoading: true,
    },
  };
}

function GeneralSettings({ settings }: { settings: Settings }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Site Information
          </CardTitle>
          <CardDescription>
            Basic information about your website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name</Label>
              <Input
                id="siteName"
                defaultValue={settings.general.siteName}
                placeholder="Your Site Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteUrl">Site URL</Label>
              <Input
                id="siteUrl"
                defaultValue={settings.general.siteUrl}
                placeholder="https://yoursite.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="siteDescription">Site Description</Label>
            <Textarea
              id="siteDescription"
              defaultValue={settings.general.siteDescription}
              placeholder="A brief description of your site"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Localization</CardTitle>
          <CardDescription>Language and regional settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select defaultValue={settings.general.language}>
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select defaultValue={settings.general.timezone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">
                    Pacific Time
                  </SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ContentSettings({ settings }: { settings: Settings }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Content Display
          </CardTitle>
          <CardDescription>
            Configure how content is displayed on your site
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postsPerPage">Posts per page</Label>
              <Input
                id="postsPerPage"
                type="number"
                defaultValue={settings.content.postsPerPage}
                min="1"
                max="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultPostStatus">Default post status</Label>
              <Select defaultValue={settings.content.defaultPostStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Comments</Label>
                <div className="text-sm text-muted-foreground">
                  Allow visitors to comment on posts
                </div>
              </div>
              <Switch defaultChecked={settings.content.allowComments} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Moderate comments</Label>
                <div className="text-sm text-muted-foreground">
                  Comments must be approved before appearing
                </div>
              </div>
              <Switch defaultChecked={settings.content.moderateComments} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Post revisions</Label>
                <div className="text-sm text-muted-foreground">
                  Keep a history of post changes
                </div>
              </div>
              <Switch defaultChecked={settings.content.enableRevisions} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SecuritySettings({ settings }: { settings: Settings }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Authentication & Security
          </CardTitle>
          <CardDescription>
            Configure security settings for your site
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session timeout (hours)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                defaultValue={settings.security.sessionTimeout}
                min="1"
                max="168"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxLoginAttempts">Max login attempts</Label>
              <Input
                id="maxLoginAttempts"
                type="number"
                defaultValue={settings.security.maxLoginAttempts}
                min="1"
                max="10"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-factor authentication</Label>
                <div className="text-sm text-muted-foreground">
                  Require 2FA for admin users
                </div>
              </div>
              <Switch defaultChecked={settings.security.enableTwoFactor} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable CAPTCHA</Label>
                <div className="text-sm text-muted-foreground">
                  Add CAPTCHA to login and registration forms
                </div>
              </div>
              <Switch defaultChecked={settings.security.enableCaptcha} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>User registration</Label>
                <div className="text-sm text-muted-foreground">
                  Allow new users to register
                </div>
              </div>
              <Switch
                defaultChecked={settings.security.allowUserRegistration}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PerformanceSettings({ settings }: { settings: Settings }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Performance Optimization
          </CardTitle>
          <CardDescription>
            Configure caching and performance settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable caching</Label>
                <div className="text-sm text-muted-foreground">
                  Cache pages and content for faster loading
                </div>
              </div>
              <Switch defaultChecked={settings.performance.enableCaching} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable compression</Label>
                <div className="text-sm text-muted-foreground">
                  Compress CSS, JS, and HTML files
                </div>
              </div>
              <Switch defaultChecked={settings.performance.enableCompression} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Lazy loading</Label>
                <div className="text-sm text-muted-foreground">
                  Load images only when they come into view
                </div>
              </div>
              <Switch defaultChecked={settings.performance.enableLazyLoading} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Content Delivery Network</Label>
                <div className="text-sm text-muted-foreground">
                  Use CDN for static assets
                </div>
              </div>
              <Switch defaultChecked={settings.performance.enableCdn} />
            </div>
          </div>

          {settings.performance.enableCdn && (
            <div className="space-y-2">
              <Label htmlFor="cdnUrl">CDN URL</Label>
              <Input
                id="cdnUrl"
                defaultValue={settings.performance.cdnUrl}
                placeholder="https://cdn.yoursite.com"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(2)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
            <Skeleton className="h-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function SettingsContent() {
  const settings = await getSettings();

  return (
    <Tabs defaultValue="general" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="content">Content</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="performance">Performance</TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <GeneralSettings settings={settings} />
      </TabsContent>

      <TabsContent value="content">
        <ContentSettings settings={settings} />
      </TabsContent>

      <TabsContent value="security">
        <SecuritySettings settings={settings} />
      </TabsContent>

      <TabsContent value="performance">
        <PerformanceSettings settings={settings} />
      </TabsContent>

      <div className="flex justify-end">
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </Tabs>
  );
}

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your site settings and preferences
        </p>
      </div>

      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}
