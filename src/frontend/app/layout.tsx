import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AuthCallbackHandler } from "@/components/features/Auth/AuthCallbackHandler";
import { SiteFooter } from "@/components/layout/SiteFooter";
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
    <html lang="pt-BR" style={{ backgroundColor: "var(--color-bg)" }}>
      <body className="min-h-screen bg-surface-bg text-surface-text" style={{ backgroundColor: "var(--color-bg)" }}>
        <AuthCallbackHandler />
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">
            {children}
          </div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
