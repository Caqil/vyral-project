import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "@ui/src/styles/globals.css";
import "@vyral/ui/styles/themes.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Vyral CMS",
    template: "%s | Vyral CMS",
  },
  description:
    "Modern, plugin-based content management system built with Next.js",
  keywords: [
    "CMS",
    "Next.js",
    "TypeScript",
    "MongoDB",
    "Blog",
    "Content Management",
  ],
  authors: [{ name: "Vyral Team" }],
  creator: "Vyral Team",
  metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXTAUTH_URL || "http://localhost:3000",
    title: "Vyral CMS",
    description: "Modern, plugin-based content management system",
    siteName: "Vyral CMS",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vyral CMS",
    description: "Modern, plugin-based content management system",
    creator: "@vyralcms",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          inter.className,
          "min-h-screen bg-background font-sans antialiased"
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
