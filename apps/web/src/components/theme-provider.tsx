"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

// Custom theme context for Vyral CMS
interface VyralThemeContextType {
  currentTheme: string;
  availableThemes: string[];
  setTheme: (theme: string) => void;
  customColors: Record<string, string>;
  updateCustomColors: (colors: Record<string, string>) => void;
}

const VyralThemeContext = React.createContext<
  VyralThemeContextType | undefined
>(undefined);

export function VyralThemeProvider({
  children,
  defaultTheme = "default",
  themes = ["default", "modern", "minimal"],
}: {
  children: React.ReactNode;
  defaultTheme?: string;
  themes?: string[];
}) {
  const [currentTheme, setCurrentTheme] = React.useState(defaultTheme);
  const [customColors, setCustomColors] = React.useState<
    Record<string, string>
  >({});

  const setTheme = React.useCallback(
    (theme: string) => {
      if (themes.includes(theme)) {
        setCurrentTheme(theme);
        // Apply theme to document
        document.documentElement.setAttribute("data-theme", theme);
      }
    },
    [themes]
  );

  const updateCustomColors = React.useCallback(
    (colors: Record<string, string>) => {
      setCustomColors(colors);
      // Apply custom colors as CSS variables
      Object.entries(colors).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--color-${key}`, value);
      });
    },
    []
  );

  const value = React.useMemo(
    () => ({
      currentTheme,
      availableThemes: themes,
      setTheme,
      customColors,
      updateCustomColors,
    }),
    [currentTheme, themes, setTheme, customColors, updateCustomColors]
  );

  return (
    <VyralThemeContext.Provider value={value}>
      {children}
    </VyralThemeContext.Provider>
  );
}

export function useVyralTheme() {
  const context = React.useContext(VyralThemeContext);
  if (context === undefined) {
    throw new Error("useVyralTheme must be used within a VyralThemeProvider");
  }
  return context;
}
