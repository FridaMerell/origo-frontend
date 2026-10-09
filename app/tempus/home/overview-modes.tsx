"use client"

import type { ReactNode } from "react"
import { useOverview } from "./overview-provider"
import { SelectionLink } from "./selection-link"
import type { SelectionChange } from "./selection"

type Reading = { key: string; label: string; chosen: boolean; change: SelectionChange }

// Tempus's usual button, the same as "Hämta nära mig" and "Planera en rutt"
// further down the page: thin frame, italic display type, square corners.
const BUTTON = "inline-flex items-center border bg-transparent px-4 py-2.5 font-display text-sm font-medium italic tracking-wide no-underline transition-colors"
// Not chosen: the button as it always looks, accent text in a light frame.
const BUTTON_IDLE = "border-border text-accent hover:text-accent-hover"
// Chosen: ink text in the same ink frame as the table under it. No fill.
const BUTTON_CHOSEN = "border-text text-text"

// Which species the register lists, as a row of buttons over it: the followed
// ones (for a visitor with a session), the whole selection with the most
// interesting first, or the whole selection per landscape type. Every reading
// can be reached from every other. On the right stands whatever is handed in.
export function ReadingButtons({ children }: { children?: ReactNode }) {
  const { isGuest, selection } = useOverview()
  const { view, mode } = selection

  const readings: Reading[] = [
    // A visitor without a session follows nothing.
    ...(isGuest ? [] : [{ key: "followed", label: "Följda arter", chosen: view === "followed", change: { view: "followed" } as const }]),
    { key: "list", label: "Mest intressant", chosen: view === "all" && mode === "list", change: { view: "all", mode: "list", landscapeType: null } },
    { key: "landscape", label: "Per miljö", chosen: view === "all" && mode === "landscape", change: { view: "all", mode: "landscape", landscapeType: null } },
  ]

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <nav aria-label="Visning" className="flex flex-wrap items-center gap-2.5">
        {readings.map((reading) => (
          <SelectionLink
            key={reading.key}
            change={reading.change}
            aria-current={reading.chosen ? "page" : undefined}
            className={`${BUTTON} ${reading.chosen ? BUTTON_CHOSEN : BUTTON_IDLE}`}
          >
            {reading.label}
          </SelectionLink>
        ))}
      </nav>
      {children}
    </div>
  )
}
