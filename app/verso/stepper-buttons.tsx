"use client"

import { ArrowLeft, ArrowRight } from "lucide-react"

const buttonClassName = "rounded bg-accent-wash px-2 py-1 text-sm text-accent hover:bg-accent-active hover:text-accent-contrast disabled:opacity-50 disabled:hover:bg-accent-wash disabled:hover:text-accent"

export function StepperButtons({
  index,
  length,
  onIndexChange,
  className = "flex gap-1 justify-between",
}: {
  index: number
  length: number
  onIndexChange: (index: number) => void
  className?: string
}) {
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => onIndexChange(Math.max(0, index - 1))}
        disabled={index === 0}
        className={buttonClassName}
      >
        <ArrowLeft size={16} />
      </button>
      <button
        type="button"
        onClick={() => onIndexChange(Math.min(length - 1, index + 1))}
        disabled={index === length - 1}
        className={buttonClassName}
      >
        <ArrowRight size={16} />
      </button>
    </div>
  )
}
