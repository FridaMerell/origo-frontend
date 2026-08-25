"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

export type SelectOption<T extends string> = {
  value: T;
  label: ReactNode;
};

type SelectProps<T extends string> = {
  options: SelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  placeholder?: ReactNode;
  className?: string;
};

export function Select<T extends string>({
  options,
  value,
  onChange,
  placeholder = "Välj...",
  className = "",
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-1.5 border-b border-accent-hover px-1 py-1 text-left text-sm text-text-muted hover:text-text"
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <Icon name="chevron-down" size={13} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-sm">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setOpen(false);
                if (option.value !== value) onChange(option.value);
              }}
              className="block w-full truncate px-2.5 py-1.5 text-left text-sm text-text hover:bg-accent-wash hover:text-accent"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
