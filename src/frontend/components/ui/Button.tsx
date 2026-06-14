import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "danger" | "danger-outline" | "outline";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700",
  danger: "bg-status-danger text-white hover:bg-red-600",
  "danger-outline": "border border-red-500/45 text-red-500 hover:bg-red-500/10 dark:text-red-400",
  outline: "border border-accent-500 text-accent-600 hover:bg-accent-500/10 dark:text-accent-400",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}, ref) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-xs font-bold uppercase tracking-wide transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${variants[variant]} ${className}`}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
});
