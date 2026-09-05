"use client"

import type { ReactNode } from "react"

export function Pager({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  label,
  as = "div",
  className = "flex items-center justify-between text-xs text-text-muted",
  buttonClassName = "disabled:text-text-faint",
  prevLabel = "Föregående",
  nextLabel = "Nästa",
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  disabled?: boolean
  label?: ReactNode
  as?: "div" | "li"
  className?: string
  buttonClassName?: string
  prevLabel?: ReactNode
  nextLabel?: ReactNode
}) {
  if (totalPages <= 1) return null

  const Container = as
  return (
    <Container className={className}>
      <button
        type="button"
        disabled={disabled || page === 1}
        onClick={() => onPageChange(page - 1)}
        className={buttonClassName}
      >
        {prevLabel}
      </button>
      <span>{label ?? `Sida ${page} av ${totalPages}`}</span>
      <button
        type="button"
        disabled={disabled || page === totalPages}
        onClick={() => onPageChange(page + 1)}
        className={buttonClassName}
      >
        {nextLabel}
      </button>
    </Container>
  )
}
