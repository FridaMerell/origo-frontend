"use client"

import { ArrowLeft, ArrowRight } from "lucide-react"

const buttonClassName = "-ml-px inline-flex size-8 items-center justify-center border border-border bg-surface text-text-muted transition-colors first:ml-0 first:rounded-l-md last:rounded-r-md hover:z-10 hover:border-accent hover:bg-accent-wash hover:text-accent disabled:bg-surface-2 disabled:text-text-faint/40"

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
