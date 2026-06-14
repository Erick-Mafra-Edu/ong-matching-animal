import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  className?: string;
}

export function Badge({ children, className = "" }: BadgeProps) {
  return (
    <span className={`rounded-full border border-accent-500/35 bg-accent-500/12 px-2.5 py-1 text-[10px] font-medium leading-none text-accent-600 dark:text-accent-400 ${className}`}>
      {children}
    </span>
  );
}
