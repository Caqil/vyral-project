"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui";
import {
  LayoutDashboard,
  FileText,
  Users,
  Image,
  Settings,
  Puzzle,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  subItems?: MenuItem[];
}

interface ModuleMenuItem {
  id: string;
  name: string;
  href: string;
  icon?: string;
  moduleSlug: string;
  moduleName: string;
  order?: number;
}

interface Module {
  _id: string;
  manifest: {
    name: string;
    slug: string;
    icon?: string;
    menuItems?: ModuleMenuItem[];
  };
  status: "active" | "inactive" | "installed" | "error";
}

// Default core navigation items
const coreNavigation: MenuItem[] = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Posts", href: "/admin/posts", icon: FileText },
  { name: "Pages", href: "/admin/pages", icon: FileText },
  { name: "Media", href: "/admin/media", icon: Image },
  { name: "Users", href: "/admin/users", icon: Users },
];

// Icon mapping for dynamic icons (you can extend this)
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  FileText,
  Users,
  Image,
  Settings,
  Puzzle,
};

export function AdminSidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "modules",
  ]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  // Fetch active modules on component mount
  useEffect(() => {
    fetchActiveModules();
  }, []);

  const fetchActiveModules = async () => {
    try {
      const response = await fetch("/api/admin/modules?status=active");
      const data = await response.json();

      if (response.ok) {
        setModules(data.modules || []);
      } else {
        console.error("Failed to fetch modules:", data.error);
      }
    } catch (error) {
      console.error("Error fetching modules:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  // Generate module navigation items
  const generateModuleNavigation = (): MenuItem[] => {
    const moduleItems: MenuItem[] = [];

    modules.forEach((module) => {
      if (module.status === "active" && module.manifest.menuItems) {
        // Add module menu items
        module.manifest.menuItems.forEach((item) => {
          const icon = iconMap[item.icon || "Puzzle"] || Puzzle;
          moduleItems.push({
            name: item.name,
            href: item.href,
            icon,
            badge: undefined,
          });
        });
      }
    });

    // Sort by order if specified
    return moduleItems.sort((a, b) => {
      // You can implement custom sorting logic here if modules specify order
      return a.name.localeCompare(b.name);
    });
  };

  // Create the complete navigation structure
  const navigation: MenuItem[] = [
    ...coreNavigation,
    ...(modules.length > 0
      ? [
          {
            name: "Modules",
            href: "/admin/modules",
            icon: Puzzle,
            subItems: [
              {
                name: "Manage Modules",
                href: "/admin/modules",
                icon: Settings,
              },
              ...generateModuleNavigation(),
              // Add individual module settings
              ...modules
                .filter((module) => module.status === "active")
                .map((module) => ({
                  name: `${module.manifest.name} Settings`,
                  href: `/admin/modules/${module.manifest.slug}/settings`,
                  icon: Settings,
                })),
            ],
          },
        ]
      : []),
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  const renderNavigationItem = (item: MenuItem, level: number = 0) => {
    const Icon = item.icon;
    const isActive = pathname === item.href;
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedSections.includes(item.name.toLowerCase());

    if (hasSubItems) {
      return (
        <div key={item.name} className="space-y-1">
          <button
            onClick={() => toggleSection(item.name.toLowerCase())}
            className={cn(
              "flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              "text-muted-foreground hover:text-foreground hover:bg-accent",
              level > 0 && "ml-4"
            )}
          >
            <div className="flex items-center space-x-3">
              <Icon className="h-4 w-4" />
              <span>{item.name}</span>
              {item.badge && (
                <span className="ml-auto bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-md">
                  {item.badge}
                </span>
              )}
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {isExpanded && item.subItems && (
            <div className="space-y-1 ml-4">
              {item.subItems.map((subItem) =>
                renderNavigationItem(subItem, level + 1)
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.name}
        href={item.href}
        className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-accent",
          level > 0 && "ml-4"
        )}
      >
        <Icon className="h-4 w-4" />
        <span>{item.name}</span>
        {item.badge && (
          <span className="ml-auto bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-md">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          {isMobileOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-background border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b">
            <Link
              href="/admin/dashboard"
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">
                  V
                </span>
              </div>
              <span className="text-xl font-bold">Vyral CMS</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {loading ? (
              // Loading skeleton
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center space-x-3 px-3 py-2"
                  >
                    <div className="w-4 h-4 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded flex-1 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              // Dynamic navigation
              navigation.map((item) => renderNavigationItem(item))
            )}
          </nav>

          {/* Footer with module info */}
          {!loading && modules.length > 0 && (
            <div className="p-4 border-t">
              <div className="text-xs text-muted-foreground">
                {modules.filter((p) => p.status === "active").length} active
                module
                {modules.filter((p) => p.status === "active").length !== 1
                  ? "s"
                  : ""}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
