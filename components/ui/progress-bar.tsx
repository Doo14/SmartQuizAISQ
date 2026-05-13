import * as React from "react";

type ProgressColor = "green" | "orange" | "red" | "default";

const colorMap: Record<ProgressColor, string> = {
  green: "bg-[color:var(--primary)]",
  orange: "bg-[color:var(--accent)]",
  red: "bg-[color:var(--danger)]",
  default: "bg-zinc-700",
};

export function ProgressBar({
  value,
  max = 100,
  color = "green",
  label,
  className,
}: {
  value: number;
  max?: number;
  color?: ProgressColor;
  label?: string;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={className}>
      {label ? (
        <div className="mb-1 flex items-center justify-between text-xs font-bold text-zinc-600">
          <span>{label}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      ) : null}
      <div className="h-3 overflow-hidden rounded-full border-2 border-[color:var(--border)] bg-zinc-100 shadow-[2px_2px_0_#1a1a1a]">
        <div
          className={["h-full rounded-full transition-all duration-500", colorMap[color]].join(" ")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
