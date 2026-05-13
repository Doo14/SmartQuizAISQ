import Link from "next/link";
import * as React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-bold border-2 border-[color:var(--border)] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/35 disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-[color:var(--primary)] text-white shadow-[4px_4px_0_#1a1a1a] hover:shadow-[6px_6px_0_#1a1a1a] active:shadow-[2px_2px_0_#1a1a1a]",
  secondary:
    "bg-[color:var(--surface-cream)] text-zinc-900 shadow-[4px_4px_0_#1a1a1a] hover:shadow-[6px_6px_0_#1a1a1a] active:shadow-[2px_2px_0_#1a1a1a]",
  ghost:
    "bg-transparent text-zinc-700 border-transparent shadow-none hover:bg-[color:var(--surface-cream)] hover:border-[color:var(--border)]",
  danger:
    "bg-[color:var(--danger)] text-white shadow-[4px_4px_0_#1a1a1a] hover:shadow-[6px_6px_0_#1a1a1a] active:shadow-[2px_2px_0_#1a1a1a]",
};

const sizeClass: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[base, variantClass[variant], sizeClass[size], className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export type ButtonLinkProps = React.ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
  className?: string;
};

export function ButtonLink({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={[base, variantClass[variant], sizeClass[size], className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
