import type { Metadata } from "next"
import Link from "next/link"
import { getTempusRoutes } from "@/app/lib/dal"

export const metadata: Metadata = {
  title: "Rutter | Tempus",
  description: "Planerade körsträckor med stoppställen rankade efter artdata.",
}

function formatDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })
}

export default async function RoutesPage() {
  const routes = await getTempusRoutes({ page_size: 100 })
  const sorted = [...routes].sort((a, b) =>
    (b.planned_date ?? "").localeCompare(a.planned_date ?? ""),
  )

  return (
    <div className="container mx-auto max-w-4xl py-5 max-sm:px-3 sm:py-7">
      <article className="overflow-hidden rounded-card border border-border bg-surface text-text">
        <header className="px-4 pb-2 pt-3 sm:px-5">
          <div className="flex items-center justify-between border-b border-border pb-1.5 font-display text-[9px] italic text-text-faint">
            <span>Ruttförteckning</span>
            <span>{sorted.length} {sorted.length === 1 ? "rutt" : "rutter"}</span>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 py-3">
            <h1 className="font-display text-2xl font-medium italic tracking-wide sm:text-3xl">
              Dina rutter
            </h1>
            <Link
              href="/rutt/ny"
              className="font-display text-sm italic text-accent no-underline hover:text-accent-hover"
            >
              Ny rutt
            </Link>
          </div>
        </header>

        <section className="px-3 pb-4 sm:px-5 sm:pb-6">
          <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_7rem] border-l border-t border-border font-display text-[9px] italic leading-tight text-text-muted sm:grid-cols-[2.75rem_minmax(0,1.6fr)_9rem_6rem_4rem]">
            <span className="border-b border-r border-border px-2 py-1.5 text-center">Nr</span>
            <span className="border-b border-r border-border px-3 py-1.5">Namn</span>
            <span className="border-b border-r border-border px-3 py-1.5">Datum</span>
            <span className="hidden border-b border-r border-border px-3 py-1.5 sm:block">Korridor</span>
            <span className="hidden border-b border-r border-border px-2 py-1.5 text-center sm:block">Punkter</span>
          </div>

          {sorted.length === 0 ? (
            <div className="border-l border-border">
              {[0, 1, 2, 3].map((line) => (
                <div
                  key={line}
                  className="grid h-11 grid-cols-[2.25rem_minmax(0,1fr)_7rem] border-b border-r border-border sm:grid-cols-[2.75rem_minmax(0,1.6fr)_9rem_6rem_4rem]"
                >
                  <span className="border-r border-border" />
                  <span className="border-r border-border" />
                  <span className="border-r border-border" />
                  <span className="hidden border-r border-border sm:block" />
                  <span className="hidden border-r border-border sm:block" />
                </div>
              ))}
              <p className="border-b border-r border-border px-3 py-4 text-center font-display text-sm italic text-text-muted">
                Inga rutter än.{" "}
                <Link href="/rutt/ny" className="text-accent hover:text-accent-hover">
                  Planera din första
                </Link>
                .
              </p>
            </div>
          ) : (
            <ol className="border-l border-border">
              {sorted.map((route, index) => {
                const plannedDate = formatDate(route.planned_date)
                const pointCount = route.geometry?.coordinates.length ?? 0
                return (
                  <li key={route.id}>
                    <Link
                      href={`/rutt/${route.id}`}
                      className="grid min-h-12 grid-cols-[2.25rem_minmax(0,1fr)_7rem] border-b border-r border-border font-display no-underline transition-colors hover:bg-surface-2/40 sm:grid-cols-[2.75rem_minmax(0,1.6fr)_9rem_6rem_4rem]"
                    >
                      <span className="flex items-center justify-end border-r border-border px-2 py-2 text-[10px] italic tabular-nums text-text-faint">
                        {index + 1}
                      </span>
                      <span className="flex min-w-0 items-center border-r border-border px-3 py-2 text-sm italic tracking-wide text-text">
                        <span className="truncate">{route.name}</span>
                      </span>
                      <span className="flex items-center border-r border-border px-3 py-2 text-xs italic text-text-muted">
                        {plannedDate ?? "—"}
                      </span>
                      <span className="hidden items-center border-r border-border px-3 py-2 text-xs italic tabular-nums text-text-muted sm:flex">
                        {(route.corridor_metres / 1000).toLocaleString("sv-SE")} km
                      </span>
                      <span className="hidden items-center justify-center border-r border-border px-2 py-2 text-xs italic tabular-nums text-text-muted sm:flex">
                        {pointCount || "—"}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      </article>
    </div>
  )
}
