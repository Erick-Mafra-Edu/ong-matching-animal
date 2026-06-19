"use client";

import { useEffect, useState } from "react";

interface ScrollToTopButtonProps {
  className?: string;
}

export function ScrollToTopButton({ className = "" }: ScrollToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsVisible(window.scrollY > 220);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <button
      aria-hidden={!isVisible}
      aria-label="Voltar ao topo"
      className={`fixed bottom-5 right-5 z-[80] inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-field-border)] bg-[var(--color-card)] text-[var(--color-text)] shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--color-field-border-focus)] hover:bg-[var(--color-card-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-field-border-focus)] ${isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"} ${className}`}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      type="button"
    >
      <span className="text-lg font-black leading-none">↑</span>
    </button>
  );
}
