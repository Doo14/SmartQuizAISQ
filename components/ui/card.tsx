import * as React from "react";

type ShadowColor = "dark" | "green" | "orange" | "red";

const shadowMap: Record<ShadowColor, string> = {
  dark: "shadow-[5px_5px_0_#1a1a1a]",
  green: "shadow-[5px_5px_0_#166534]",
  orange: "shadow-[5px_5px_0_#D4860A]",
  red: "shadow-[5px_5px_0_#DC2626]",
};

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  description?: string;
  right?: React.ReactNode;
  shadow?: ShadowColor;
};

export function Card({ className, title, description, right, shadow = "dark", children, ...props }: CardProps) {
  return (
    <section
      className={[
        "min-w-0 rounded-2xl border-2 border-[color:var(--border)] bg-white",
        shadowMap[shadow],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {title || description || right ? (
        <header className="flex items-start justify-between gap-4 border-b-2 border-[color:var(--border)] px-5 py-4">
          <div className="grid gap-0.5">
            {title ? <h2 className="text-base font-bold text-zinc-900">{title}</h2> : null}
            {description ? <p className="text-sm text-zinc-600">{description}</p> : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </header>
      ) : null}
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}
