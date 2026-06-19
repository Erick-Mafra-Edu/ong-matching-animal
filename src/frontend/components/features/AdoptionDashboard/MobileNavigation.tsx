import Link from "next/link";
import { Heart, MessageCircle, Settings, User } from "lucide-react";
import type { AriaAttributes, ReactNode } from "react";
import type { NavigationItem } from "@/types/adoption";
import { PawIcon } from "./Icons";

interface MobileNavigationProps {
  items: NavigationItem[];
}

export function MobileNavigation({ items }: MobileNavigationProps) {
  return (
    <nav
      className="theme-panel animate-mobile-enter grid h-18 border-t backdrop-blur-md shadow-[0_-10px_30px_rgba(0,0,0,0.12)]"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      aria-label="Navegação principal"
    >
      {items.map((item) => (
        <NavigationControl
          aria-label={item.label}
          aria-current={item.active ? "page" : undefined}
          href={item.href}
          key={item.id}
          className={`relative flex flex-col items-center justify-center gap-1 px-2 py-2 transition duration-300 active:scale-95 ${
            item.active
              ? "bg-cyan-400/10 text-[var(--color-text)]"
              : "text-[var(--color-text-muted)] hover:bg-[var(--color-card-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          <span className={`grid h-9 w-9 place-items-center rounded-full transition-colors ${
            item.active ? "bg-cyan-300 text-slate-950" : "bg-white/[0.06] text-current"
          }`}>
            {item.icon === "discover" && <PawIcon className="h-5 w-5" />}
            {item.icon === "interests" && <Heart className="h-5 w-5" aria-hidden="true" strokeWidth={2.2} />}
            {item.icon === "messages" && <MessageCircle className="h-5 w-5" aria-hidden="true" strokeWidth={2.2} />}
            {item.icon === "profile" && <User className="h-5 w-5" aria-hidden="true" strokeWidth={2.2} />}
            {item.icon === "admin" && <Settings className="h-5 w-5" aria-hidden="true" strokeWidth={2.2} />}
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
            item.active ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"
          }`}>
            {item.label}
          </span>
          {item.notification && <span className="animate-notification absolute left-1/2 top-3 ml-3 h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.8)]" aria-label="Nova notificação" />}
        </NavigationControl>
      ))}
    </nav>
  );
}

function NavigationControl({
  children,
  className,
  href,
  ...props
}: {
  children: ReactNode;
  className: string;
  href?: string;
} & AriaAttributes) {
  if (href) {
    return <Link className={className} href={href} {...props}>{children}</Link>;
  }

  return <button className={className} type="button" {...props}>{children}</button>;
}
