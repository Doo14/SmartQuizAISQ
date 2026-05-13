import * as React from "react";
import { ButtonLink, type ButtonLinkProps } from "./button";

export type EmptyStateProps = {
  icon?: string;
  title: string;
  description?: string;
  action?: ButtonLinkProps & { label: string };
};

export function EmptyState({ icon = "📭", title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-white/60 px-6 py-14 text-center">
      <div className="mb-4 text-4xl">{icon}</div>
      <div className="text-lg font-bold text-zinc-900">{title}</div>
      {description ? <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p> : null}
      {action ? (
        <ButtonLink {...action} className="mt-5">
          {action.label}
        </ButtonLink>
      ) : null}
    </div>
  );
}
