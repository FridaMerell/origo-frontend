"use client"

import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { SelectionLink } from "./selection-link"
import type { SelectionChange } from "./selection"

export type IndexTab = { key: string; label: string; active: boolean; change: SelectionChange }

// The start page's one kind of tabs: small labels on a line, the chosen one
// underlined in the accent, the underline gliding to a newly chosen tab. Used
// for the page's selection and for the readings of the species alike, so the
// two look the same. On the right of the line stands whatever is handed in.
export function IndexTabs({ label, tabs, children }: { label: string; tabs: IndexTab[]; children?: ReactNode }) {
  const active = tabs.find((tab) => tab.active)?.key ?? null
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null)
  const links = useRef<Record<string, HTMLAnchorElement | null>>({})

  useLayoutEffect(() => {
    const measure = () => {
      const link = active ? links.current[active] : null
      setBar(link ? { left: link.offsetLeft, width: link.offsetWidth } : null)
    }
    measure()
    // The tab widths change once the webfont has replaced the fallback.
    document.fonts?.ready.then(measure)
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [active])

  return (
    <nav aria-label={label} className="relative flex items-end gap-6 border-b border-border">
      {tabs.map((tab) => (
        <SelectionLink
          key={tab.key}
          ref={(node) => {
            links.current[tab.key] = node
          }}
          change={tab.change}
          aria-current={tab.active ? "page" : undefined}
          className={`-mb-px border-b-2 pb-2 font-mono text-[12px] uppercase tracking-[.16em] no-underline transition-colors active:translate-y-px ${
            tab.active ? `text-text ${bar ? "border-transparent" : "border-accent"}` : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          {tab.label}
        </SelectionLink>
      ))}
      {bar ? (
        <span
          aria-hidden="true"
          className="absolute -bottom-px left-0 h-0.5 bg-accent transition-[translate,width] duration-200 ease-(--ease-standard) motion-reduce:transition-none"
          style={{ translate: `${bar.left}px`, width: bar.width }}
        />
      ) : null}
      {children ? <div className="ml-auto pb-2">{children}</div> : null}
    </nav>
  )
}
