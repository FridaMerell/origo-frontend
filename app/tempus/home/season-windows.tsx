import Link from "next/link"

export type WindowEntry = { key: string; name: string; href: string; days: number | null }

function SeasonWindow({
  title,
  entries,
  ink,
  emptyText,
  count,
  page,
  hasNext,
  hasPrevious,
  pageParam,
  otherPageParam,
  otherPage,
}: {
  title: string
  entries: WindowEntry[]
  ink: string
  emptyText: string
  count: number
  page: number
  hasNext: boolean
  hasPrevious: boolean
  pageParam: "incoming_page" | "outgoing_page"
  otherPageParam: "incoming_page" | "outgoing_page"
  otherPage: number
}) {
  const pageHref = (nextPage: number) =>
    `/tempus?view=all&${pageParam}=${nextPage}&${otherPageParam}=${otherPage}`

  return (
    <div className="border border-border bg-surface">
      <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-2">
        <span className="font-mono text-[11px] uppercase tracking-[.16em] text-text-faint">{title}</span>
        <span className="font-mono text-[10px] tabular-nums text-text-faint">{count.toLocaleString("sv-SE")} totalt</span>
      </div>
      {entries.length > 0 ? (
        <ol>
          {entries.map((entry, index) => (
            <li key={entry.key}>
              <Link
                href={entry.href}
                className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-border px-4 py-2.5 no-underline transition-colors last:border-b-0 hover:bg-surface-2/45"
              >
                <span className="font-mono text-[12px] tabular-nums text-text-faint">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 truncate font-display text-sm text-text">{entry.name}</span>
                <span className={`shrink-0 font-display text-sm italic tabular-nums ${ink}`}>
                  {entry.days != null ? `${entry.days} d` : "—"}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-4 py-6 text-sm leading-relaxed text-text-muted">{emptyText}</p>
      )}
      {count > 0 && (hasPrevious || hasNext) ? (
        <nav className="flex items-center justify-between border-t border-border px-4 py-2 font-mono text-[10px] uppercase tracking-wide" aria-label={`${title} paginering`}>
          {hasPrevious ? <Link href={pageHref(page - 1)} className="text-link hover:underline">Föregående</Link> : <span className="text-text-faint">Föregående</span>}
          <span className="text-text-faint">Sida {page}</span>
          {hasNext ? <Link href={pageHref(page + 1)} className="text-link hover:underline">Nästa</Link> : <span className="text-text-faint">Nästa</span>}
        </nav>
      ) : null}
    </div>
  )
}

export function SeasonWindows({
  isAll,
  incomingEntries,
  outgoingEntries,
  incomingCount,
  outgoingCount,
  incomingPage,
  outgoingPage,
  incomingHasNext,
  incomingHasPrevious,
  outgoingHasNext,
  outgoingHasPrevious,
}: {
  isAll: boolean
  incomingEntries: WindowEntry[]
  outgoingEntries: WindowEntry[]
  incomingCount: number
  outgoingCount: number
  incomingPage: number
  outgoingPage: number
  incomingHasNext: boolean
  incomingHasPrevious: boolean
  outgoingHasNext: boolean
  outgoingHasPrevious: boolean
}) {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <SeasonWindow
        title="Snart i säsong"
        entries={incomingEntries}
        ink="text-secondary"
        count={isAll ? incomingCount : incomingEntries.length}
        page={incomingPage}
        hasNext={isAll && incomingHasNext}
        hasPrevious={isAll && incomingHasPrevious}
        pageParam="incoming_page"
        otherPageParam="outgoing_page"
        otherPage={outgoingPage}
        emptyText={
          isAll
            ? "Inga arter väntas gå in i säsong just nu."
            : "Ingen bevakad art väntas gå in i säsong just nu."
        }
      />
      <SeasonWindow
        title="Snart ur säsong"
        entries={outgoingEntries}
        ink="text-warning"
        count={isAll ? outgoingCount : outgoingEntries.length}
        page={outgoingPage}
        hasNext={isAll && outgoingHasNext}
        hasPrevious={isAll && outgoingHasPrevious}
        pageParam="outgoing_page"
        otherPageParam="incoming_page"
        otherPage={incomingPage}
        emptyText={
          isAll
            ? "Inga arter väntas lämna säsongen just nu."
            : "Ingen bevakad art väntas lämna säsongen just nu."
        }
      />
    </section>
  )
}
