"use client"

import { SelectionLink } from "./selection-link"

// The three things on the page that are paged through, by the selection field that holds their page.
type PageField = "page" | "incomingPage" | "outgoingPage"

const STEP = "inline-block no-underline transition-colors active:translate-y-px"

// Back and forward through a paged list. `compact` is the small "‹ 1 ›" beside
// a heading; otherwise the steps are written out under the list.
export function PageSteps({
  field,
  page,
  hasPrevious,
  hasNext,
  label,
  compact = false,
}: {
  field: PageField
  page: number
  hasPrevious: boolean
  hasNext: boolean
  // What is being paged through, for screen readers.
  label: string
  compact?: boolean
}) {
  if (!hasPrevious && !hasNext) return null

  const previous = compact ? "‹" : "‹ Föregående"
  const next = compact ? "›" : "Nästa ›"
  const link = compact ? `${STEP} px-1 text-link hover:text-link-hover` : `${STEP} text-text-muted hover:text-text`
  const idle = compact ? "px-1" : "text-text-faint"

  return (
    <nav
      aria-label={label}
      className={compact ? "flex items-baseline gap-1.5 text-[12px]" : "mt-6 flex items-center justify-center gap-5 font-mono text-[11px] uppercase tracking-[.14em]"}
    >
      {hasPrevious ? (
        <SelectionLink change={{ [field]: page - 1 }} aria-label="Föregående" className={link}>{previous}</SelectionLink>
      ) : (
        <span className={idle}>{previous}</span>
      )}
      <span className={compact ? "text-[10px]" : "text-text-faint"}>{compact ? page : `Sida ${page}`}</span>
      {hasNext ? (
        <SelectionLink change={{ [field]: page + 1 }} aria-label="Nästa" className={link}>{next}</SelectionLink>
      ) : (
        <span className={idle}>{next}</span>
      )}
    </nav>
  )
}
