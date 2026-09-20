"use client"

export type TabItem<T extends string> = {
  id: T
  label: React.ReactNode
  /** Small faint number shown after the label. */
  count?: number
}

/** Controlled tab bar. Scrolls sideways on narrow screens without showing a scrollbar. */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  className = "",
}: {
  tabs: readonly TabItem<T>[]
  active: T
  onChange: (id: T) => void
  className?: string
}) {
  return (
    <div
      role="tablist"
      className={`-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {tabs.map((tab) => {
        const selected = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm duration-200 ${
              selected
                ? "border-accent text-accent"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && <span className="text-xs text-text-faint">{tab.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
