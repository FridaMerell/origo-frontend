import type { HTMLAttributes } from "react"

export type ChipVariant =
  | "accent"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "neutral-active"

type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: ChipVariant
}

const VARIANT_CLASSES: Record<ChipVariant, string> = {
  accent: "border-accent/50 bg-accent-wash text-accent",
  secondary: "border-secondary/50 bg-secondary-wash text-secondary",
  success: "border-success/50 bg-success-wash text-success",
  warning: "border-warning/50 bg-warning-wash text-warning",
  danger: "border-danger/50 bg-danger-wash text-danger",
  neutral: "border-border bg-surface-2 text-text-muted",
  "neutral-active": "border-border-strong bg-surface text-text",
}

export function Chip({
  variant = "neutral",
  className = "",
  ...props
}: ChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2.5 py-1 font-mono text-xs ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  )
}
