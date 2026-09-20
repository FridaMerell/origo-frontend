"use client"

export type ChipOption = { id: string; label: string }

/** Multi-select as toggleable chips. Controlled; use with react-hook-form's Controller. */
export function ChipSelect({
  options,
  value,
  onChange,
  emptyLabel = "Inget att välja.",
}: {
  options: ChipOption[]
  value: string[]
  onChange: (value: string[]) => void
  emptyLabel?: string
}) {
  if (options.length === 0) return <p className="text-xs text-text-faint">{emptyLabel}</p>

  const chosen = new Set(value.map(String))
  const toggle = (id: string) =>
    onChange(chosen.has(id) ? value.filter((v) => String(v) !== id) : [...value, id])

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = chosen.has(String(option.id))
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(String(option.id))}
            className={`rounded-full border px-3 py-1 text-xs duration-200 ${
              selected
                ? "border-accent bg-accent-wash text-accent"
                : "border-border text-text-muted hover:bg-accent-wash hover:text-accent"
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
