import Link from "next/link"
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react"
import { twMerge } from "tailwind-merge"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: "primary" | "secondary" | "ghost" | "paper" | "paper-bordered"
	size?: "sm" | "md"
	rounded?:
		| "rounded"
		| "rounded-sm"
		| "rounded-md"
		| "rounded-lg"
		| "rounded-full"
		| "rounded-none"
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
	variant?: "primary" | "secondary" | "ghost" | "paper" | "paper-bordered"
	size?: "sm" | "md"
	rounded?:
		| "rounded"
		| "rounded-sm"
		| "rounded-md"
		| "rounded-lg"
		| "rounded-full"
		| "rounded-none"
}

const SIZES = {
	sm: "px-3 py-1.5 text-sm",
	md: "px-4 py-2.5 text-base",
}

const VARIANTS = {
	primary: "bg-primary text-primary-contrast",
	accent: "bg-accent text-accent-contrast",
	secondary: "bg-secondary text-bg border border-border",
	ghost: "bg-transparent text-text",
	paper:
		"bg-transparent font-display italic font-medium tracking-wide text-accent hover:text-accent-hover",
	"paper-bordered":
		"bg-transparent font-display italic font-medium tracking-wide text-accent border border-border hover:text-accent-hover disabled:bg-transparent disabled:cursor-not-allowed disabled:opacity-50",
	square: "p-2 text-base",
}

export function Button({
	variant = "primary",
	size = "md",
	disabled,
	rounded = "rounded",
	className = "",
	...rest
}: ButtonProps) {
	const resolvedRounded = variant === "paper" ? "rounded-none" : rounded

	return (
		<button
			disabled={disabled}
			className={twMerge(
				"inline-flex items-center gap-2 font-body font-semibold transition-colors cursor-pointer",
				SIZES[size],
				VARIANTS[variant],
				resolvedRounded,
				disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
				className,
			)}
			{...rest}
		/>
	)
}

export const LinkButton = ({
	href,
	variant = "primary",
	size = "md",
	rounded = "rounded",
	className = "",
	...rest
}: LinkProps) => {
	const resolvedRounded = variant === "paper" ? "rounded-none" : rounded

	if (!href) return null
	return (
		<Link
			href={href}
			className={twMerge(
				"inline-flex items-center gap-2 font-body font-semibold transition-colors cursor-pointer",
				SIZES[size],
				VARIANTS[variant],
				resolvedRounded,
				className,
			)}
			{...rest}
		/>
	)
}
