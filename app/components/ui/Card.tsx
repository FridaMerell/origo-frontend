import type { HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge(
        "rounded-card border border-border bg-surface p-4.5 font-body text-text shadow-card",
        className,
      )}
      {...rest}
    />
  );
}
