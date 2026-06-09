import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AuthCallbackHandler } from "@/components/features/Auth/AuthCallbackHandler";
import { ScreenOnboarding } from "@/components/features/Onboarding/ScreenOnboarding";
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
    <html lang="pt-BR">
      <body>
        <AuthCallbackHandler />
        {children}
        <ScreenOnboarding />
      </body>
    </html>
  );
}
