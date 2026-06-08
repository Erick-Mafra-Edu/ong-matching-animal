import Link from "next/link";
import type { AriaAttributes, ReactNode } from "react";
import type { NavigationItem } from "@/types/adoption";
import { PawIcon } from "./Icons";

interface MobileNavigationProps {
  items: NavigationItem[];
}

export function MobileNavigation({ items }: MobileNavigationProps) {
  return (
    <nav className="animate-mobile-enter grid h-16 border-t border-white/10 bg-black" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }} aria-label="Navegação principal">
      {items.map((item) => (
        <NavigationControl
          aria-label={item.label}
          aria-current={item.active ? "page" : undefined}
          href={item.href}
          key={item.id}
          className={`relative grid place-items-center transition duration-300 hover:bg-white/5 hover:text-cyan-200 active:scale-95 ${item.active ? "text-cyan-400" : "text-slate-400"}`}
        >
          {item.icon === "discover" && <PawIcon className="h-6 w-6" />}
          {item.icon === "interests" && <span className="text-xl" aria-hidden="true">♡</span>}
          {item.icon === "messages" && <span className="text-2xl" aria-hidden="true">♣</span>}
          {item.icon === "profile" && <span className="text-xl" aria-hidden="true">♟</span>}
          {item.icon === "admin" && <span className="text-xl" aria-hidden="true">⚙</span>}
          {item.notification && <span className="animate-notification absolute left-1/2 top-3 h-2 w-2 rounded-full bg-cyan-300" aria-label="Nova notificação" />}
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
