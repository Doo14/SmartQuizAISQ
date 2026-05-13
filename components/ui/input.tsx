import * as React from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Input({ className, label, hint, error, id, ...props }: InputProps) {
  const autoId = React.useId();
  const inputId = id ?? autoId;

  return (
    <label className="grid gap-1.5 text-sm">
      {label ? <span className="font-bold text-zinc-900">{label}</span> : null}
      <input
        id={inputId}
        className={[
          "h-9 w-full rounded-xl border-2 border-[color:var(--border)] bg-white px-3 text-sm text-zinc-900 shadow-[2px_2px_0_#1a1a1a] outline-none transition-all",
          "placeholder:text-zinc-400 focus:shadow-[1px_1px_0_#1a1a1a] focus:ring-2 focus:ring-[color:var(--primary)]/20",
          error ? "border-red-500 bg-red-50" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
      {error ? <span className="text-xs font-semibold text-red-600">{error}</span> : hint ? <span className="text-xs text-zinc-500">{hint}</span> : null}
    </label>
  );
}
