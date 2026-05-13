import * as React from "react";

type Variant = "default" | "success" | "warning" | "danger";

const variantClass: Record<Variant, string> = {
  default: "border-2 border-[color:var(--border)] bg-white text-zinc-700 shadow-[2px_2px_0_#1a1a1a]",
  success: "border-2 border-[color:var(--border)] bg-[color:var(--primary-surface)] text-emerald-800 shadow-[2px_2px_0_#166534]",
  warning: "border-2 border-[color:var(--border)] bg-[color:var(--accent-surface)] text-amber-900 shadow-[2px_2px_0_#D4860A]",
  danger: "border-2 border-[color:var(--border)] bg-[color:var(--danger-surface)] text-red-800 shadow-[2px_2px_0_#DC2626]",
};

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: Variant;
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold",
        variantClass[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
