import type { ReactNode } from "react";
import type { Metadata } from "next";
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
        {children}
      </body>
    </html>
  );
}
