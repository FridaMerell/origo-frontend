import type { ReactNode } from "react"

/**
 * Page title row shared by Verso's list and detail pages. On phones the title sits above the
 * actions, which wrap freely; from `sm` the actions sit to the right of the title.
 */
export function PageHeader({
  title,
  meta,
  badge,
  actions,
}: {
  title: ReactNode
  /** Quiet line under the title, e.g. a count or a status sentence. */
  meta?: ReactNode
  /** Shown next to the title, e.g. a priority badge. */
  badge?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="m-0 min-w-0 break-words font-display text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            {title}
          </h1>
          {badge}
        </div>
        {meta && <p className="m-0 text-sm text-text-muted">{meta}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
