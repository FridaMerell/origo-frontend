import type { HTMLAttributes } from "react";

export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card border border-border bg-surface p-4.5 font-body text-text shadow-md ${className}`}
      {...rest}
    />
  );
}
