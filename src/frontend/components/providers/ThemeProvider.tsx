"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      <ThemeBodySync />
      {children}
    </NextThemesProvider>
  );
}

function ThemeBodySync() {
  const { theme, resolvedTheme, systemTheme } = useTheme();

  useEffect(() => {
    const activeTheme = theme === "system"
      ? (systemTheme ?? resolvedTheme)
      : (resolvedTheme ?? systemTheme);

    const backgroundColor = activeTheme === "light" ? "#f1f5f9" : "#020617";
    const textColor = activeTheme === "light" ? "#0f172a" : "#f8fafc";

    document.documentElement.style.backgroundColor = backgroundColor;
    document.body.style.backgroundColor = backgroundColor;
    document.body.style.color = textColor;
  }, [resolvedTheme, systemTheme, theme]);

  return null;
}
