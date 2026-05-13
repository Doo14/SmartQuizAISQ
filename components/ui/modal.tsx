"use client";

import * as React from "react";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  /** Max width class, default max-w-lg */
  size?: "sm" | "md" | "lg";
};

const sizeClass = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" } as const;

export function Modal({ open, onClose, title, description, children, size = "lg" }: ModalProps) {
  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className={[
          "relative w-full rounded-2xl border-2 border-[color:var(--border)] bg-white shadow-[6px_6px_0_#1a1a1a]",
          sizeClass[size],
        ].join(" ")}
        role="dialog"
        aria-modal
      >
        {title || description ? (
          <div className="border-b-2 border-[color:var(--border)] px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                {title ? <h2 className="text-lg font-bold text-zinc-900">{title}</h2> : null}
                {description ? <p className="mt-0.5 text-sm text-zinc-600">{description}</p> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-[color:var(--border)] bg-white text-zinc-500 shadow-[2px_2px_0_#1a1a1a] transition hover:bg-[color:var(--danger-surface)] hover:text-red-600 hover:shadow-[3px_3px_0_#DC2626]"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
        ) : null}

        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
