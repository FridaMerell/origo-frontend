"use client"

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { Card } from "@/app/components/ui/Card"
import { registerFireplaceHeating } from "@/app/verso/uppvarmning/_actions/residential-heating"
import { formatShortWeekdayDate, formatTime, heatingCalendarDay } from "@/app/verso/uppvarmning/heating-log-row"

/** The house's newest fireplace heating, loaded on the server with the home page. */
export type FireplaceNow = {
  /** `start_time` of the newest heating, or null when none is registered. */
  latest: string | null
  /** When the server fetched it, so the first render reads the same on the server and in the browser. */
  checkedAt: number
  error?: string
}

/** A fire counts as lit for this long after it was started. */
const LIT_MS = 60 * 60 * 1000
/** After a tap the heating is only registered once this has passed, so "Ångra" can still cancel it. */
const UNDO_MS = 3000
const MINUTE_MS = 60 * 1000
const DAY_MS = 24 * 60 * MINUTE_MS

/** The current time, kept fresh every half minute and whenever the tab is shown again. */
function useNow(initial: number) {
  const [now, setNow] = useState(initial)
  useEffect(() => {
    const tick = () => setNow(Date.now())
    tick()
    const timer = window.setInterval(tick, MINUTE_MS / 2)
    document.addEventListener("visibilitychange", tick)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [])
  return now
}

/** "i dag", "i går", otherwise "sön 15 nov", in the house's timezone. */
function shortDay(timestamp: string, now: number) {
  const days = Math.round((Date.parse(heatingCalendarDay(now)) - Date.parse(heatingCalendarDay(timestamp))) / DAY_MS)
  if (days === 0) return "i dag"
  if (days === 1) return "i går"
  return formatShortWeekdayDate(timestamp)
}

/**
 * Not lit: the whole card is "Tänd nu". One tap shows "Brasan är tänd" at once with "Ångra" for three seconds;
 * only then is the heating registered, with the time of the tap, so undoing never needs anything deleted.
 * Lit (under an hour after the newest fire, or just tapped): the warm card says "Brasan är tänd".
 */
export function FireplaceWidget({
  connection,
  fireplace,
  className = "",
}: {
  connection: string
  fireplace: FireplaceNow
  className?: string
}) {
  const { latest, checkedAt, error } = fireplace
  const now = useNow(checkedAt)
  // ISO time of the tap, kept until the server's newest heating has caught up with it.
  const [tappedAt, setTappedAt] = useState<string | null>(null)
  const [undoable, setUndoable] = useState(false)
  const [failure, setFailure] = useState<string>()
  const timer = useRef<number | undefined>(undefined)

  const started = latest ? new Date(latest).getTime() : null
  const lit = (started !== null && now >= started && now - started < LIT_MS) || tappedAt !== null

  useEffect(() => {
    if (tappedAt && latest && Date.parse(latest) >= Date.parse(tappedAt)) setTappedAt(null)
  }, [latest, tappedAt])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function light() {
    if (lit) return
    const at = new Date().toISOString()
    setFailure(undefined)
    setTappedAt(at)
    setUndoable(true)
    timer.current = window.setTimeout(async () => {
      setUndoable(false)
      try {
        const result = await registerFireplaceHeating(connection, { start_time: at })
        if (result?.error) {
          setTappedAt(null)
          setFailure(result.error)
        }
      } catch (err) {
        setTappedAt(null)
        setFailure(err instanceof Error ? err.message : String(err))
      }
    }, UNDO_MS)
  }

  function undo() {
    window.clearTimeout(timer.current)
    setUndoable(false)
    setTappedAt(null)
  }

  const tappable = lit
    ? {}
    : {
        role: "button",
        tabIndex: 0,
        onClick: light,
        onKeyDown: (event: KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            light()
          }
        },
      }

  return (
    <Card
      {...tappable}
      className={`col-span-1 flex h-full min-w-0 flex-col justify-end ${
        lit ? "bg-accent-wash" : "cursor-pointer border-border-strong transition-colors hover:bg-surface-2 active:translate-y-px"
      } ${className}`}
    >
      {lit ? (
        <>
          <p aria-live="polite" className="m-0 font-display text-4xl font-semibold leading-tight text-accent">
            Brasan är tänd
          </p>
          {undoable ? (
            <button
              type="button"
              onClick={undo}
              className="mt-2 cursor-pointer self-start border-0 bg-transparent p-0 text-sm font-semibold text-text underline underline-offset-4"
            >
              Ångra
            </button>
          ) : null}
        </>
      ) : (
        <>
          <p className="m-0 font-display text-4xl font-semibold leading-tight text-text">Tänd nu</p>
          {latest && started !== null ? (
            <p className="m-0 mt-1.5 text-sm text-text-muted">
              Senast tänd {shortDay(latest, now)} kl. {formatTime(latest)}
            </p>
          ) : null}
          {error ? (
            <p className="m-0 mt-1.5 break-words text-sm text-text-muted" title={error}>
              Brasorna kunde inte hämtas: {error}
            </p>
          ) : null}
          {failure ? <p className="m-0 mt-1.5 break-words text-sm text-danger">{failure}</p> : null}
        </>
      )}
    </Card>
  )
}
