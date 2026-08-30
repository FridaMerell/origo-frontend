"use client"

import { useState, useTransition, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/Button"
import { createRoute } from "@/app/actions/tempus"
import { RoutePlanner, type PlannedRoute } from "./route-planner"

function today() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}

export default function RouteBuilder() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [name, setName] = useState("")
  const [plannedDate, setPlannedDate] = useState(today())
  const [corridorKm, setCorridorKm] = useState(3)
  const [planned, setPlanned] = useState<PlannedRoute | null>(null)
  const [error, setError] = useState<string | null>(null)

  const geometry = planned?.geometry ?? null

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("Ange ett namn för rutten.")
      return
    }
    if (!geometry) {
      setError("Planera rutten genom att ange från och till.")
      return
    }

    startTransition(async () => {
      const result = await createRoute({
        name: name.trim(),
        planned_date: plannedDate,
        corridor_metres: Math.round(corridorKm * 1000),
        geometry,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      router.push(result.routeId ? `/rutt/${result.routeId}` : "/rutt")
    })
  }

  return (
    <div className="container mx-auto max-w-4xl py-5 max-sm:px-3 sm:py-7">
      <Link
        href="/rutt"
        className="mb-3 flex w-fit items-center font-mono text-[10px] uppercase tracking-[.16em] text-text-muted no-underline hover:text-accent"
      >
        ‹ Rutter
      </Link>

      <form className="flex flex-col gap-3" onSubmit={submit}>
        <article className="overflow-hidden rounded-card border border-border bg-surface text-text shadow-card">
          <header className="px-4 pb-3 pt-3 sm:px-5 sm:pb-4">
            <div className="flex items-center justify-between border-b border-border pb-1.5 font-display text-[9px] italic text-text-faint">
              <span>Ruttförteckning</span>
              <span>Ny rutt</span>
            </div>

            <div className="border-b border-border px-3 py-4 text-center sm:py-5">
              <h1 className="font-display text-2xl font-medium italic tracking-wide sm:text-3xl">
                Ny rutt
              </h1>
              <p className="mx-auto mt-1.5 max-w-md font-display text-xs italic leading-5 text-text-muted">
                Ange start och mål så planerar Google körvägen. Sätt en
                sökkorridor — Tempus rankar sedan stoppställen längs vägen efter
                artrikedom och rariteter.
              </p>
            </div>
          </header>

          <section className="px-3 pb-3 sm:px-5 sm:pb-5">
            <div className="grid border-l border-t border-border sm:grid-cols-[1.4fr_1fr]">
              <label className="flex flex-col border-b border-r border-border px-3 py-2 font-display text-[9px] italic text-text-faint">
                Namn
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="T.ex. Stockholm → Uppsala"
                  className="mt-1 h-9 rounded border border-field-border bg-surface px-2.5 font-body text-xs not-italic text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                />
              </label>

              <label className="flex flex-col border-b border-r border-border px-3 py-2 font-display text-[9px] italic text-text-faint">
                Planerat datum
                <input
                  type="date"
                  value={plannedDate}
                  onChange={(event) => setPlannedDate(event.target.value)}
                  className="mt-1 h-9 rounded border border-field-border bg-surface px-2.5 font-body text-xs not-italic text-text focus:border-accent focus:outline-none"
                />
              </label>
            </div>

            <div className="border-x border-b border-border px-3 py-2 font-display text-[9px] italic text-text-faint">
              <span className="flex items-center justify-between">
                Sökkorridor
                <output className="font-mono text-xs not-italic text-text-muted">
                  {corridorKm} km · {(corridorKm * 1000).toLocaleString("sv-SE")} m
                </output>
              </span>
              <input
                aria-label="Sökkorridor i kilometer"
                type="range"
                min={1}
                max={20}
                step={1}
                value={corridorKm}
                onChange={(event) => setCorridorKm(Number(event.target.value))}
                className="mt-1.5 w-full accent-accent"
              />
              <span className="mt-1 block not-italic text-text-muted">
                Sökområdets radie — en slang med den här bredden runt hela
                ruttlinjen. Fågelvägsavstånd, inte körväg. Inget utanför slangen
                föreslås någonsin, så sätt den hellre vidd (3–5 km) och begränsa
                sedan avstickaren när du söker stopp.
              </span>
            </div>

            <div className="border-x border-b border-border px-3 py-3">
              <p className="font-display text-[9px] italic text-text-faint">
                Ruttlinje
              </p>
              <div className="mt-2">
                <RoutePlanner onRouteChange={setPlanned} disabled={pending} />
              </div>
            </div>
          </section>
        </article>

        {error ? (
          <p className="rounded bg-danger-wash px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending || !name.trim() || !geometry}>
            {pending ? "Sparar…" : "Spara rutt"}
          </Button>
          {planned ? (
            <span className="font-mono text-[10px] uppercase tracking-[.14em] text-text-muted">
              {(planned.distanceMetres / 1000).toLocaleString("sv-SE", {
                maximumFractionDigits: 1,
              })}{" "}
              km körväg
            </span>
          ) : null}
        </div>
      </form>
    </div>
  )
}
