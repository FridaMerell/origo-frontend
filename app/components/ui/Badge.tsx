import type { ReactNode } from "react";

export type BadgeVariant = "accent" | "secondary" | "success" | "warning" | "danger" | "neutral";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  accent: "bg-accent-wash text-accent",
  secondary: "bg-secondary-wash text-secondary",
  success: "bg-success-wash text-success",
  warning: "bg-warning-wash text-warning",
  danger: "bg-danger-wash text-danger",
  neutral: "bg-surface-2 text-text-muted",
};

export function Badge({
  children,
  variant = "neutral",
}: {
  children: ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-body text-xs font-medium ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  );
}
