"use client";

import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import {
  Bell,
  Moon,
  Sun,
  User,
  LogOut,
  Search,
  Settings,
  Shield,
  Menu,
  X,
  ChevronRight,
  Home,
} from "lucide-react";
import {
  Button,
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Badge,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
} from "@/components/ui";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

interface AdminHeaderProps {
  breadcrumbs?: Array<{ label: string; href?: string }>;
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
  notificationCount?: number;
}

export function AdminHeader({
  breadcrumbs = [],
  onMobileMenuToggle,
  isMobileMenuOpen = false,
  notificationCount = 0,
}: AdminHeaderProps) {
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Fix hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate breadcrumbs from pathname if none provided
  const generatedBreadcrumbs =
    breadcrumbs.length > 0
      ? breadcrumbs
      : pathname
          .split("/")
          .filter(Boolean)
          .map((segment, index, array) => ({
            label:
              segment.charAt(0).toUpperCase() +
              segment.slice(1).replace("-", " "),
            href:
              index === array.length - 1
                ? undefined
                : "/" + array.slice(0, index + 1).join("/"),
          }));

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case "k":
            e.preventDefault();
            setSearchOpen(true);
            break;
          case "d":
            e.preventDefault();
            setTheme(theme === "light" ? "dark" : "light");
            break;
        }
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [theme, setTheme]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/admin/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  if (!mounted) {
    return <AdminHeaderSkeleton />;
  }

  return (
    <header className="sticky top-0 z-50 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        {/* Left side - Logo, Mobile menu, Breadcrumbs */}
        <div className="flex items-center space-x-4 min-w-0 flex-1">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMobileMenuToggle}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>

          {/* Logo/Title */}
          <div className="flex items-center space-x-2">
            <Link
              href="/admin"
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold hidden sm:block">
                Admin Panel
              </h1>
            </Link>
          </div>

          {/* Breadcrumbs */}
          {generatedBreadcrumbs.length > 0 && (
            <nav
              className="hidden lg:flex items-center space-x-1 text-sm text-muted-foreground"
              aria-label="Breadcrumb"
            >
              <Home className="h-4 w-4" />
              {generatedBreadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center space-x-1">
                  <ChevronRight className="h-3 w-3" />
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-foreground font-medium">
                      {crumb.label}
                    </span>
                  )}
                </div>
              ))}
            </nav>
          )}
        </div>

        {/* Right side - Search, Actions, User menu */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Search */}
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
                <kbd className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 hidden sm:inline-block h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                  ⌘K
                </kbd>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <form
                onSubmit={handleSearch}
                className="flex items-center border-b px-3"
              >
                <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                <Input
                  placeholder="Search admin panel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-0 focus-visible:ring-0 h-11"
                  autoFocus
                />
              </form>
              <div className="p-4 text-sm text-muted-foreground">
                <p>Quick search across users, content, and settings</p>
              </div>
            </PopoverContent>
          </Popover>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label="Toggle theme"
            className="relative"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <kbd className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 hidden sm:inline-block h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
              ⌘D
            </kbd>
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link
              href="/admin/notifications"
              aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount})` : ""}`}
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {notificationCount > 9 ? "9+" : notificationCount}
                </Badge>
              )}
            </Link>
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full ring-offset-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="User menu"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={session?.user?.image || ""}
                    alt={session?.user?.name || "User avatar"}
                  />
                  <AvatarFallback className="bg-primary/10">
                    {session?.user?.name?.charAt(0)?.toUpperCase() || (
                      <User className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
                {status === "loading" && (
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {session?.user?.name || "User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session?.user?.email || "No email"}
                  </p>
                  <Badge variant="secondary" className="w-fit text-xs mt-1">
                    Administrator
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href="/admin/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile Settings
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/admin/preferences" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Preferences
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/admin/security" className="cursor-pointer">
                  <Shield className="mr-2 h-4 w-4" />
                  Security
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-red-600 dark:text-red-400 cursor-pointer focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

// Loading skeleton for better UX
function AdminHeaderSkeleton() {
  return (
    <header className="h-16 border-b bg-background/95 backdrop-blur">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-32 hidden sm:block" />
        </div>
        <div className="flex items-center space-x-4">
          <Skeleton className="h-9 w-9 rounded" />
          <Skeleton className="h-9 w-9 rounded" />
          <Skeleton className="h-9 w-9 rounded" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
    </header>
  );
}
