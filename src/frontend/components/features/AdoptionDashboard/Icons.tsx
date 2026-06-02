interface IconProps {
  className?: string;
}

export function PawIcon({ className = "" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 10.1c1.5 0 2.8-1.8 2.8-4s-1.3-4-2.8-4-2.8 1.8-2.8 4 1.3 4 2.8 4ZM6.1 11.2c1.3-.5 1.7-2.4.9-4.2S4.5 4.2 3.2 4.8 1.5 7.2 2.3 9s2.5 2.8 3.8 2.2Zm11.8 0c1.3.6 3-.4 3.8-2.2s.4-3.7-.9-4.2S17.7 5.2 17 7s-.4 3.7.9 4.2ZM12 12c-3.7 0-6.8 2.5-6.8 5.4 0 2.2 1.8 3.2 3.7 3.2 1.2 0 2-.5 3.1-.5s1.9.5 3.1.5c1.9 0 3.7-1 3.7-3.2 0-2.9-3.1-5.4-6.8-5.4Z" />
    </svg>
  );
}

export function CrossIcon({ className = "" }: IconProps) {
  return <span className={className} aria-hidden="true">×</span>;
}

export function UndoIcon({ className = "" }: IconProps) {
  return <span className={className} aria-hidden="true">↶</span>;
}

export function VerifiedIcon({ className = "" }: IconProps) {
  return (
    <span className={`inline-grid place-items-center rounded-full bg-cyan-500 text-[9px] font-black text-white ${className}`} aria-label="Perfil verificado">
      ✓
    </span>
  );
}
