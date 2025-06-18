import { Suspense } from "react";
import Image from "next/image";
import { Button } from "@vyral/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@vyral/ui";
import { Badge } from "@vyral/uibadge";
import { Input } from "@vyral/uiinput";
import { Skeleton } from "@vyral/uiskeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@vyral/uitabs";
import {
  Plus,
  Search,
  Download,
  Settings,
  Trash2,
  Check,
  Eye,
  Upload,
  ExternalLink,
  Palette,
  Monitor,
  Smartphone,
  Star,
} from "lucide-react";

interface Theme {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  isActive: boolean;
  isDefault: boolean;
  hasUpdate: boolean;
  newVersion?: string;
  homepage?: string;
  demoUrl?: string;
  previewImage: string;
  screenshots: string[];
  tags: string[];
  category: string;
  downloadCount: number;
  rating: number;
  ratingCount: number;
  lastUpdated: Date;
  price?: {
    amount: number;
    currency: string;
  };
  features: string[];
  responsive: boolean;
  customizable: boolean;
}

async function getThemes(): Promise<Theme[]> {
  // Simulate API call - replace with actual theme service
  return [
    {
      id: "default",
      name: "Vyral Default",
      version: "1.0.0",
      description:
        "Clean and modern default theme with excellent typography and responsive design.",
      author: "Vyral Team",
      isActive: true,
      isDefault: true,
      hasUpdate: false,
      previewImage: "/api/placeholder/400/300",
      screenshots: ["/api/placeholder/800/600", "/api/placeholder/800/600"],
      tags: ["clean", "modern", "responsive"],
      category: "blog",
      downloadCount: 5000,
      rating: 4.8,
      ratingCount: 250,
      lastUpdated: new Date("2024-01-15"),
      features: [
        "Responsive Design",
        "Dark Mode",
        "SEO Optimized",
        "Fast Loading",
      ],
      responsive: true,
      customizable: true,
    },
    {
      id: "minimalist-pro",
      name: "Minimalist Pro",
      version: "2.1.0",
      description:
        "Ultra-clean minimalist theme focused on content and readability.",
      author: "Design Studio",
      isActive: false,
      isDefault: false,
      hasUpdate: true,
      newVersion: "2.1.1",
      homepage: "https://example.com/minimalist-pro",
      demoUrl: "https://demo.example.com/minimalist-pro",
      previewImage: "/api/placeholder/400/300",
      screenshots: ["/api/placeholder/800/600", "/api/placeholder/800/600"],
      tags: ["minimal", "clean", "typography"],
      category: "portfolio",
      downloadCount: 1200,
      rating: 4.9,
      ratingCount: 89,
      lastUpdated: new Date("2024-01-10"),
      price: { amount: 29, currency: "USD" },
      features: [
        "Premium Typography",
        "Portfolio Layouts",
        "Contact Forms",
        "Image Galleries",
      ],
      responsive: true,
      customizable: true,
    },
    {
      id: "business-corporate",
      name: "Business Corporate",
      version: "1.5.2",
      description:
        "Professional corporate theme perfect for business websites and company blogs.",
      author: "ThemeForge",
      isActive: false,
      isDefault: false,
      hasUpdate: false,
      homepage: "https://example.com/business-corporate",
      demoUrl: "https://demo.example.com/business-corporate",
      previewImage: "/api/placeholder/400/300",
      screenshots: ["/api/placeholder/800/600", "/api/placeholder/800/600"],
      tags: ["business", "corporate", "professional"],
      category: "business",
      downloadCount: 2800,
      rating: 4.6,
      ratingCount: 156,
      lastUpdated: new Date("2023-12-20"),
      price: { amount: 49, currency: "USD" },
      features: [
        "Team Pages",
        "Service Layouts",
        "Testimonials",
        "Contact Forms",
      ],
      responsive: true,
      customizable: true,
    },
    {
      id: "magazine-news",
      name: "Magazine & News",
      version: "3.0.1",
      description:
        "Feature-rich magazine theme with advanced layouts and news-focused design.",
      author: "NewsThemes",
      isActive: false,
      isDefault: false,
      hasUpdate: false,
      homepage: "https://example.com/magazine-news",
      demoUrl: "https://demo.example.com/magazine-news",
      previewImage: "/api/placeholder/400/300",
      screenshots: ["/api/placeholder/800/600", "/api/placeholder/800/600"],
      tags: ["magazine", "news", "blog"],
      category: "news",
      downloadCount: 3500,
      rating: 4.7,
      ratingCount: 203,
      lastUpdated: new Date("2024-01-05"),
      features: [
        "Multiple Layouts",
        "Ad Management",
        "Social Integration",
        "Newsletter",
      ],
      responsive: true,
      customizable: true,
    },
  ];
}

function ThemeCard({ theme }: { theme: Theme }) {
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={theme.previewImage}
          alt={`${theme.name} preview`}
          fill
          className="object-cover transition-transform hover:scale-105"
        />
        {theme.isActive && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-green-600 text-white">
              <Check className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </div>
        )}
        {theme.isDefault && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary">Default</Badge>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
          <div className="flex gap-2">
            <Button size="sm" variant="secondary">
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
            {theme.demoUrl && (
              <Button size="sm" variant="secondary">
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{theme.name}</CardTitle>
              {theme.hasUpdate && (
                <Badge variant="destructive" className="text-xs">
                  Update
                </Badge>
              )}
              {theme.price && (
                <Badge variant="outline" className="text-xs">
                  ${theme.price.amount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>v{theme.version}</span>
              <span>•</span>
              <span>by {theme.author}</span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span>{theme.rating}</span>
                <span>({theme.ratingCount})</span>
              </div>
            </div>
          </div>
        </div>
        <CardDescription className="line-clamp-2">
          {theme.description}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {theme.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {theme.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{theme.tags.length - 3}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {theme.responsive && (
              <div className="flex items-center gap-1">
                <Monitor className="h-3 w-3" />
                <Smartphone className="h-3 w-3" />
                <span>Responsive</span>
              </div>
            )}
            {theme.customizable && (
              <div className="flex items-center gap-1">
                <Palette className="h-3 w-3" />
                <span>Customizable</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              {!theme.isActive ? (
                <Button size="sm">
                  <Check className="h-4 w-4 mr-1" />
                  Activate
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled>
                  Current Theme
                </Button>
              )}

              <Button size="sm" variant="outline">
                <Settings className="h-4 w-4 mr-1" />
                Customize
              </Button>
            </div>

            <div className="flex gap-1">
              {theme.hasUpdate && (
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              )}

              {!theme.isDefault && (
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ThemesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="aspect-[4/3]" />
          <CardHeader>
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function ThemesContent({ category }: { category: string }) {
  const themes = await getThemes();
  const filteredThemes =
    category === "all"
      ? themes
      : themes.filter((theme) => theme.category === category);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredThemes.map((theme) => (
        <ThemeCard key={theme.id} theme={theme} />
      ))}
    </div>
  );
}

export default function AdminThemesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Themes</h1>
          <p className="text-muted-foreground">
            Manage your site appearance and discover new themes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Upload Theme
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Browse Themes
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input placeholder="Search themes..." className="pl-10" />
        </div>

        <Button variant="outline" size="sm">
          All Categories
        </Button>

        <Button variant="outline" size="sm">
          Free & Paid
        </Button>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Themes</TabsTrigger>
          <TabsTrigger value="blog">Blog</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="news">News</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Suspense fallback={<ThemesSkeleton />}>
            <ThemesContent category="all" />
          </Suspense>
        </TabsContent>

        <TabsContent value="blog">
          <Suspense fallback={<ThemesSkeleton />}>
            <ThemesContent category="blog" />
          </Suspense>
        </TabsContent>

        <TabsContent value="business">
          <Suspense fallback={<ThemesSkeleton />}>
            <ThemesContent category="business" />
          </Suspense>
        </TabsContent>

        <TabsContent value="portfolio">
          <Suspense fallback={<ThemesSkeleton />}>
            <ThemesContent category="portfolio" />
          </Suspense>
        </TabsContent>

        <TabsContent value="news">
          <Suspense fallback={<ThemesSkeleton />}>
            <ThemesContent category="news" />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
