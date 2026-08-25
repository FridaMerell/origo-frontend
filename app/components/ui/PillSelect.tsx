"use client";

import type { ReactNode } from "react";

export type PillSelectOption<T extends string> = {
  value: T;
  label: ReactNode;
};

type PillSelectProps<T extends string> = {
  options: PillSelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  className?: string;
};

export function PillSelect<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: PillSelectProps<T>) {
  return (
    <div className={`inline-flex flex-wrap gap-1.5 ${className}`}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3 py-1 font-body text-sm font-medium transition-colors ${
              active
                ? "bg-accent text-accent-contrast"
                : "bg-surface-2 text-text-muted hover:bg-accent-wash hover:text-accent"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
