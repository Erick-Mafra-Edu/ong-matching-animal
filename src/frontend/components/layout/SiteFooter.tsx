"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Globe, Mail, MapPin, Phone } from "lucide-react";
import { carregarOngSettings, type OngSettings } from "@/lib/ongSettings";

const githubUrl = "https://github.com/Erick-Mafra-Edu/ong-matching-animal";

export function SiteFooter() {
  const [settings, setSettings] = useState<OngSettings | null>(null);

  useEffect(() => {
    let isMounted = true;

    carregarOngSettings()
      .then((data) => {
        if (isMounted) setSettings(data);
      })
      .catch(() => {
        if (isMounted) setSettings(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const address = useMemo(() => {
    const parts = [
      settings?.address_line,
      settings?.city,
      settings?.state,
      settings?.postal_code,
    ].map((part) => part?.trim()).filter(Boolean);
    return parts.join(", ");
  }, [settings]);

  const socialLinks = useMemo(() => {
    if (!settings?.social_links || typeof settings.social_links !== "object") return [];

    return Object.entries(settings.social_links)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().startsWith("http"))
      .map(([label, url]) => ({ label, url }));
  }, [settings]);
  const phone = settings?.whatsapp_phone?.trim() || settings?.contact_phone?.trim() || "";
  const phoneHref = phone ? `tel:${phone.replace(/\D/g, "") || phone}` : "";
  const ongName = settings?.ong_name?.trim() || "Nome da ONG";
  const collegeName = getSettingString(settings?.settings, [
    "faculty_name",
    "college_name",
    "extension_college",
    "nome_faculdade",
    "faculdade",
  ]) || "Nome da Faculdade";

  return (
    <footer className="border-t border-white/10 bg-[#0b0f18] px-5 py-8 text-slate-300 sm:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <div>
          <p className="text-base font-black tracking-tight text-cyan-100">
            {ongName}
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-sm">
            {settings?.contact_email && (
              <FooterLink href={`mailto:${settings.contact_email}`} icon={<Mail className="h-4 w-4" />}>
                {settings.contact_email}
              </FooterLink>
            )}
            {phone && (
              <FooterLink href={phoneHref} icon={<Phone className="h-4 w-4" />}>
                {phone}
              </FooterLink>
            )}
            {settings?.website_url && (
              <FooterLink href={settings.website_url} icon={<Globe className="h-4 w-4" />}>
                Site da ONG
              </FooterLink>
            )}
            {address && (
              <span className="inline-flex items-center gap-2 text-slate-400">
                <MapPin className="h-4 w-4 text-cyan-200" aria-hidden="true" />
                {address}
              </span>
            )}
          </div>
          {socialLinks.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.16em]">
              {socialLinks.map((link) => (
                <a className="text-slate-400 transition hover:text-cyan-100" href={link.url} key={link.label} rel="noreferrer" target="_blank">
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>

        <p className="flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-white/10 pt-5 text-sm leading-6 text-slate-400">
          <span>© 2026 {ongName}.</span>
          <span>Projeto de Extensão {collegeName}.</span>
          <a className="inline-flex items-center gap-1.5 font-bold text-cyan-100 transition hover:text-cyan-200" href={githubUrl} rel="noreferrer" target="_blank">
            <GitHubIcon className="h-4 w-4" />
            Ver Créditos
          </a>
        </p>
      </div>
    </footer>
  );
}

function FooterLink({ children, href, icon }: { children: string; href: string; icon: ReactNode }) {
  return (
    <a className="inline-flex items-center gap-2 text-slate-400 transition hover:text-cyan-100" href={href}>
      <span className="text-cyan-200" aria-hidden="true">{icon}</span>
      {children}
    </a>
  );
}

function getSettingString(settings: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!settings) return "";

  for (const key of keys) {
    const value = settings[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

function GitHubIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 6.58 2 12.26c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.38-3.37-1.38-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.33 9.33 0 0 1 12 6.98c.85 0 1.71.12 2.51.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.95.68 1.91 0 1.38-.01 2.49-.01 2.83 0 .27.18.59.69.49A10.18 10.18 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}
