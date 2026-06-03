import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
}

export function Badge({ children }: BadgeProps) {
  return (
    <span className="rounded-full border border-cyan-300/80 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-medium leading-none text-cyan-100">
      {children}
    </span>
  );
}
