import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AuthCallbackHandler } from "@/components/features/Auth/AuthCallbackHandler";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Match Pet | ONG Matching Animal",
  description: "Encontre um novo companheiro para adoção",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR" style={{ backgroundColor: "var(--color-bg)" }} suppressHydrationWarning>
      <body className="min-h-screen bg-surface-bg text-surface-text" style={{ backgroundColor: "var(--color-bg)" }}>
        <ThemeProvider>
          <AuthCallbackHandler />
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">
              {children}
            </div>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
