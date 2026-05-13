import * as React from "react";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        "animate-pulse rounded-xl border-2 border-zinc-200 bg-zinc-100",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

/** A full card-shaped skeleton */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border-2 border-zinc-200 bg-white p-5 shadow-[4px_4px_0_#e5e5e5]">
      <Skeleton className="mb-3 h-5 w-2/5" />
      <Skeleton className="mb-4 h-3 w-3/5" />
      <div className="grid gap-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${85 - i * 12}%` }} />
        ))}
      </div>
    </div>
  );
}

/** Grid of skeleton cards */
export function SkeletonGrid({ count = 3, cols = 3 }: { count?: number; cols?: number }) {
  const colsClass =
    cols === 2 ? "sm:grid-cols-2" : cols === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "";
  return (
    <div className={`grid gap-4 ${colsClass}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
