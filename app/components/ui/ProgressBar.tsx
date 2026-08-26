export function ProgressBar({
  pct,
  width = "100%",
  className = "",
}: {
  pct: number
  width?: number | string
  className?: string
}) {
  return (
    <div
      className={`h-1.5 shrink-0 overflow-hidden rounded-full bg-surface-2 ${className}`}
      style={{ width }}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width]"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  )
}
