"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, Globe, Mail, Shield, Database, Palette } from "lucide-react";

const generalSettingsSchema = z.object({
  site_title: z.string().min(1, "Site title is required"),
  site_description: z.string().max(500, "Description too long"),
  site_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  timezone: z.string(),
  date_format: z.string(),
  time_format: z.string(),
});

const readingSettingsSchema = z.object({
  posts_per_page: z.number().min(1).max(50),
  show_excerpts: z.boolean(),
  excerpt_length: z.number().min(10).max(500),
  comment_status: z.enum(["open", "closed"]),
  comment_moderation: z.boolean(),
});

type GeneralSettingsData = z.infer<typeof generalSettingsSchema>;
type ReadingSettingsData = z.infer<typeof readingSettingsSchema>;

export default function AdminSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);

  const generalForm = useForm<GeneralSettingsData>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      site_title: "Vyral CMS",
      site_description: "A modern, plugin-based content management system",
      site_url: "",
      timezone: "UTC",
      date_format: "YYYY-MM-DD",
      time_format: "24h",
    },
  });

  const readingForm = useForm<ReadingSettingsData>({
    resolver: zodResolver(readingSettingsSchema),
    defaultValues: {
      posts_per_page: 10,
      show_excerpts: true,
      excerpt_length: 160,
      comment_status: "open",
      comment_moderation: true,
    },
  });

  const onSubmitGeneral = async (data: GeneralSettingsData) => {
    setIsLoading(true);
    try {
      // API call would go here
      console.log("General settings:", data);
      toast.success("General settings saved successfully!");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitReading = async (data: ReadingSettingsData) => {
    setIsLoading(true);
    try {
      // API call would go here
      console.log("Reading settings:", data);
      toast.success("Reading settings saved successfully!");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your site settings and preferences
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full max-w-2xl">
          <TabsTrigger value="general" className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:block">General</span>
          </TabsTrigger>
          <TabsTrigger value="reading" className="flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:block">Reading</span>
          </TabsTrigger>
          <TabsTrigger value="writing" className="flex items-center space-x-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:block">Writing</span>
          </TabsTrigger>
          <TabsTrigger
            value="discussion"
            className="flex items-center space-x-2"
          >
            <Shield className="h-4 w-4" />
            <span className="hidden sm:block">Discussion</span>
          </TabsTrigger>
          <TabsTrigger value="media" className="flex items-center space-x-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:block">Media</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:block">Advanced</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <form
            onSubmit={generalForm.handleSubmit(onSubmitGeneral)}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Site Identity</CardTitle>
                <CardDescription>
                  Basic information about your website
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="site_title">Site Title</Label>
                  <Input
                    id="site_title"
                    {...generalForm.register("site_title")}
                  />
                  {generalForm.formState.errors.site_title && (
                    <p className="text-sm text-red-600 mt-1">
                      {generalForm.formState.errors.site_title.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="site_description">Site Description</Label>
                  <Textarea
                    id="site_description"
                    {...generalForm.register("site_description")}
                    rows={3}
                  />
                  {generalForm.formState.errors.site_description && (
                    <p className="text-sm text-red-600 mt-1">
                      {generalForm.formState.errors.site_description.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="site_url">Site URL</Label>
                  <Input
                    id="site_url"
                    type="url"
                    placeholder="https://example.com"
                    {...generalForm.register("site_url")}
                  />
                  {generalForm.formState.errors.site_url && (
                    <p className="text-sm text-red-600 mt-1">
                      {generalForm.formState.errors.site_url.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Localization</CardTitle>
                <CardDescription>
                  Date, time, and timezone settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    onValueChange={(value) =>
                      generalForm.setValue("timezone", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">
                        Eastern Time
                      </SelectItem>
                      <SelectItem value="America/Chicago">
                        Central Time
                      </SelectItem>
                      <SelectItem value="America/Denver">
                        Mountain Time
                      </SelectItem>
                      <SelectItem value="America/Los_Angeles">
                        Pacific Time
                      </SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="date_format">Date Format</Label>
                  <Select
                    onValueChange={(value) =>
                      generalForm.setValue("date_format", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YYYY-MM-DD">2024-01-15</SelectItem>
                      <SelectItem value="MM/DD/YYYY">01/15/2024</SelectItem>
                      <SelectItem value="DD/MM/YYYY">15/01/2024</SelectItem>
                      <SelectItem value="MMM DD, YYYY">Jan 15, 2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="time_format">Time Format</Label>
                  <Select
                    onValueChange={(value) =>
                      generalForm.setValue("time_format", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">24 hour (14:30)</SelectItem>
                      <SelectItem value="12h">12 hour (2:30 PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="reading">
          <form
            onSubmit={readingForm.handleSubmit(onSubmitReading)}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Reading Settings</CardTitle>
                <CardDescription>
                  Control how your content is displayed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="posts_per_page">Posts per page</Label>
                  <Input
                    id="posts_per_page"
                    type="number"
                    min="1"
                    max="50"
                    {...readingForm.register("posts_per_page", {
                      valueAsNumber: true,
                    })}
                  />
                  {readingForm.formState.errors.posts_per_page && (
                    <p className="text-sm text-red-600 mt-1">
                      {readingForm.formState.errors.posts_per_page.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="show_excerpts">Show excerpts</Label>
                    <p className="text-sm text-muted-foreground">
                      Display excerpts instead of full content in post listings
                    </p>
                  </div>
                  <Switch
                    id="show_excerpts"
                    onCheckedChange={(checked) =>
                      readingForm.setValue("show_excerpts", checked)
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="excerpt_length">Excerpt length</Label>
                  <Input
                    id="excerpt_length"
                    type="number"
                    min="10"
                    max="500"
                    {...readingForm.register("excerpt_length", {
                      valueAsNumber: true,
                    })}
                  />
                  {readingForm.formState.errors.excerpt_length && (
                    <p className="text-sm text-red-600 mt-1">
                      {readingForm.formState.errors.excerpt_length.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comment Settings</CardTitle>
                <CardDescription>
                  Configure how comments work on your site
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="comment_status">Default comment status</Label>
                  <Select
                    onValueChange={(value) =>
                      readingForm.setValue("comment_status", value as any)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select comment status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="comment_moderation">
                      Comment moderation
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Require approval before comments appear
                    </p>
                  </div>
                  <Switch
                    id="comment_moderation"
                    onCheckedChange={(checked) =>
                      readingForm.setValue("comment_moderation", checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="writing">
          <Card>
            <CardHeader>
              <CardTitle>Writing Settings</CardTitle>
              <CardDescription>
                Configure the writing and editing experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Writing settings coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discussion">
          <Card>
            <CardHeader>
              <CardTitle>Discussion Settings</CardTitle>
              <CardDescription>
                Manage comments and user interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Discussion settings coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media">
          <Card>
            <CardHeader>
              <CardTitle>Media Settings</CardTitle>
              <CardDescription>
                Configure media uploads and image sizes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Media settings coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>Advanced configuration options</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Advanced settings coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
