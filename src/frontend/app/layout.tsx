"use client";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "ONG Matching Animal",
  description: "Sistema de matchmaking dinâmico de animais para adoção",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
