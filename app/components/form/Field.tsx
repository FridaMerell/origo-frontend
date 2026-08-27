import type { ReactNode } from "react";
import type { FieldError } from "react-hook-form";

export const fieldInputClass =
  "rounded border border-field-border bg-surface px-2.5 py-1.5 text-text";

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: FieldError;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-text-muted">
      {label}
      {children}
      {error && <span className="text-xs text-danger">{error.message}</span>}
    </label>
  );
}
