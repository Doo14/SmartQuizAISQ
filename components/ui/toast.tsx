"use client";

import * as React from "react";

export type ToastVariant = "default" | "success" | "warning" | "danger";

export type ToastItem = {
  id: string;
  title: string;
  message?: string;
  variant?: ToastVariant;
  createdAt: number;
  ttlMs?: number;
};

type ToastContextValue = {
  push: (toast: Omit<ToastItem, "id" | "createdAt">) => void;
  clear: () => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

function variantClass(variant: ToastVariant) {
  switch (variant) {
    case "success":
      return "border-[color:var(--border)] bg-[color:var(--primary-surface)] text-emerald-900 shadow-[4px_4px_0_#166534]";
    case "warning":
      return "border-[color:var(--border)] bg-[color:var(--accent-surface)] text-amber-950 shadow-[4px_4px_0_#D4860A]";
    case "danger":
      return "border-[color:var(--border)] bg-[color:var(--danger-surface)] text-red-900 shadow-[4px_4px_0_#DC2626]";
    default:
      return "border-[color:var(--border)] bg-white text-zinc-900 shadow-[4px_4px_0_#1a1a1a]";
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const push = React.useCallback((toast: Omit<ToastItem, "id" | "createdAt">) => {
    const id = `t_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
    const createdAt = Date.now();
    const ttlMs = toast.ttlMs ?? 4500;
    const item: ToastItem = { ...toast, id, createdAt, ttlMs };

    setItems((prev) => [item, ...prev].slice(0, 5));

    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, ttlMs);
  }, []);

  const clear = React.useCallback(() => setItems([]), []);

  const value = React.useMemo(() => ({ push, clear }), [push, clear]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 grid w-[360px] max-w-[calc(100vw-2rem)] gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={[
              "pointer-events-auto rounded-xl border-2 px-4 py-3",
              variantClass(item.variant ?? "default"),
            ].join(" ")}
            role="status"
          >
            <div className="text-sm font-bold">{item.title}</div>
            {item.message ? <div className="mt-0.5 text-sm opacity-90">{item.message}</div> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
