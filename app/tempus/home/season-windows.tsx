import Link from "next/link"

export type WindowEntry = { key: string; name: string; href: string; days: number | null }

function SeasonWindow({
  title,
  entries,
  ink,
  emptyText,
}: {
  title: string
  entries: WindowEntry[]
  ink: string
  emptyText: string
}) {
  return (
    <div className="border border-border bg-surface">
      <div className="border-b border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[.16em] text-text-faint">
        {title}
      </div>
      {entries.length > 0 ? (
        <ol>
          {entries.slice(0, 3).map((entry, index) => (
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
    </div>
  )
}

export function SeasonWindows({
  isAll,
  incomingEntries,
  outgoingEntries,
}: {
  isAll: boolean
  incomingEntries: WindowEntry[]
  outgoingEntries: WindowEntry[]
}) {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <SeasonWindow
        title="Snart i säsong"
        entries={incomingEntries}
        ink="text-secondary"
        emptyText={
          isAll
            ? "Inga rapportstarka arter väntas gå in i säsong just nu."
            : "Ingen bevakad art väntas gå in i säsong just nu."
        }
      />
      <SeasonWindow
        title="Snart ur säsong"
        entries={outgoingEntries}
        ink="text-warning"
        emptyText={
          isAll
            ? "Inga rapportstarka arter väntas lämna säsongen just nu."
            : "Ingen bevakad art väntas lämna säsongen just nu."
        }
      />
    </section>
  )
}
