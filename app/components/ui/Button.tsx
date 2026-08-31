import type { ButtonHTMLAttributes } from "react"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "paper" | 'paper-bordered'
  size?: "sm" | "md"
  rounded?: "rounded" | "rounded-sm" | "rounded-md" | "rounded-lg" | "rounded-full" | "rounded-none"
}

const SIZES = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-base",
}

const VARIANTS = {
  primary: "bg-accent text-accent-contrast",
  secondary: "bg-surface-2 text-text border border-border",
  ghost: "bg-transparent text-text",
  paper: "bg-transparent font-display italic font-medium tracking-wide text-accent hover:text-accent-hover",
  'paper-bordered': "bg-transparent font-display italic font-medium tracking-wide text-accent border border-border hover:text-accent-hover disabled:bg-transparent disabled:cursor-not-allowed disabled:opacity-50",
  square: "p-2 text-base",
}

export function Button({
  variant = "primary",
  size = "md",
  disabled,
  rounded = 'rounded',
  className = "",
  ...rest
}: ButtonProps) {
  const resolvedRounded = variant === "paper" ? "rounded-none" : rounded

  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center gap-2 font-body font-semibold transition-colors cursor-pointer ${SIZES[size]} ${VARIANTS[variant]} ${resolvedRounded} ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${className}`}
      {...rest}
    />
  )
}
