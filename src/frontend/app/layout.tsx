import type { ReactNode } from "react";
import type { Metadata } from "next";
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
    <html lang="pt-BR" suppressHydrationWarning style={{ backgroundColor: "var(--color-bg)" }}>
      <body className="min-h-screen bg-surface-bg text-surface-text" style={{ backgroundColor: "var(--color-bg)" }}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
