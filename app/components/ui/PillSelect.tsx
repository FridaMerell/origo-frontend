"use client";

import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export type PillSelectOption<T extends string> = {
  value: T;
  label: ReactNode;
};

type PillSelectProps<T extends string> = {
  options: PillSelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** "pill" (rounded, filled) or "square" (bordered, in the display face, as on Tempus' pages). */
  variant?: "pill" | "square";
  className?: string;
};

const VARIANTS = {
  pill: {
    base: "rounded-full px-3 py-1 font-body text-sm font-medium transition-colors",
    active: "bg-accent text-accent-contrast",
    inactive: "bg-surface-2 text-text-muted hover:bg-accent-wash hover:text-accent",
  },
  square: {
    base: "border px-2.5 py-1 font-display italic transition-colors",
    active: "border-accent bg-accent text-accent-contrast",
    inactive: "border-border text-text-muted hover:border-accent hover:text-accent",
  },
};

export function PillSelect<T extends string>({
  options,
  value,
  onChange,
  variant = "pill",
  className = "",
}: PillSelectProps<T>) {
  const style = VARIANTS[variant];
  return (
    <div className={twMerge("inline-flex flex-wrap gap-1.5", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`${style.base} ${active ? style.active : style.inactive}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
