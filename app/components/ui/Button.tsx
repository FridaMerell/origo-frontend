import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
};

const SIZES = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-base",
};

const VARIANTS = {
  primary: "bg-accent text-accent-contrast",
  secondary: "bg-surface-2 text-text border border-border",
  ghost: "bg-transparent text-text",
};

export function Button({
  variant = "primary",
  size = "md",
  disabled,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded font-body font-semibold transition-colors ${SIZES[size]} ${VARIANTS[variant]} ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${className}`}
      {...rest}
    />
  );
}
