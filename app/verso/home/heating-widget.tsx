"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { ThermometerIcon } from "lucide-react"
import { Card } from "@/app/components/ui/Card"
import { MODE_LABELS, formatTime, useLogZones } from "@/app/verso/uppvarmning/heating-log-row"
import { formatOneDecimal as round } from "@/app/lib/formatters"
import type { HeatingLog } from "@/app/lib/dal"

/** ResidentialHeating for the home page, loaded on the server. */
export type HeatingNow = {
  connection: string
  /** Logs from the last two hours, newest first. */
  logs: HeatingLog[]
  error?: string
}

/** Shared timing for every slide in the card, off under reduced motion. */
const MOTION = "duration-200 ease-out motion-reduce:transition-none"

/**
 * A log laid out the same way at any size: its values on the left, its time and a "Zoner"/"Dölj"
 * cue on the right. Opening slides its zones out underneath, one short line per zone.
 */
function ExpandableLog({
  connection,
  log,
  open,
  onToggle,
  className = "",
  children,
}: {
  connection: string
  log: HeatingLog
  open: boolean
  onToggle: () => void
  className?: string
  children: ReactNode
}) {
  const { zones, load } = useLogZones(connection, log)
  const ref = useRef<HTMLDivElement>(null)

  function toggle() {
    if (!open) {
      load()
      // After the slide-out, scroll only the card's list (never the page) so the opened log is fully visible.
      window.setTimeout(() => {
        const element = ref.current
        const list = element?.closest<HTMLElement>("[data-heating-list]")
        if (!element || !list) return
        const box = element.getBoundingClientRect()
        const view = list.getBoundingClientRect()
        const delta = box.bottom > view.bottom ? Math.min(box.bottom - view.bottom, box.top - view.top) : box.top < view.top ? box.top - view.top : 0
        if (delta) list.scrollBy({ top: delta, behavior: "smooth" })
      }, 230)
    }
    onToggle()
  }

  const sorted = zones && !zones.loading && zones.zones ? [...zones.zones].sort((a, b) => a.area_code - b.area_code) : []

  return (
    // The hover tint covers the log and its zones together, so they read as one block.
    <div ref={ref} className={`transition-colors hover:bg-surface-2 ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className="flex w-full cursor-pointer items-baseline gap-4 px-4.5 py-2.5 text-left"
      >
        <span className="min-w-0 flex-1">{children}</span>
        <span className="text-xs text-text-faint tabular-nums">{formatTime(log.timestamp)}</span>
        <span className="w-9 text-right text-xs text-text-muted">{open ? "Dölj" : "Zoner"}</span>
      </button>
      {/* Height animates from 0 to the content's own height; the zones stay mounted once loaded. */}
      <div className={`grid transition-[grid-template-rows] ${MOTION} ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          {zones && (
            <div className="mx-4.5 mb-2.5 flex flex-col border-l border-border pl-3 text-sm leading-6 text-text-muted tabular-nums">
              {zones.loading ? (
                <span>Hämtar zoner...</span>
              ) : zones.error ? (
                <span>Zonerna kunde inte hämtas: {zones.error}</span>
              ) : !sorted.length ? (
                <span>Inga zoner i loggen.</span>
              ) : (
                sorted.map((zone) => (
                  <span key={zone.area_code}>
                    Zon {zone.area_code}
                    <span className="ml-3 font-medium text-text">{round(zone.temperature)}°</span>
                    <span className="ml-3">bör {round(zone.setpoint)}°</span>
                    <span className="ml-3">{zone.active ? "aktiv" : "inaktiv"}</span>
                  </span>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * The newest log as the current reading at the weather card's size; under it every other log of the
 * last two hours in a list that scrolls within the card. Opening a log slides its zones out in place,
 * and while a listed log is open the current reading eases down to one compact line to give it room.
 * No log is ever hidden or reordered.
 */
export function HeatingWidget({ heating, className = "" }: { heating: HeatingNow; className?: string }) {
  const { connection, logs, error } = heating
  const [latest, ...older] = logs
  const [open, setOpen] = useState<string | null>(null)
  const toggle = (log: HeatingLog) => () => setOpen(open === log.timestamp ? null : log.timestamp)
  const listedOpen = older.some((log) => log.timestamp === open)
  const listRef = useRef<HTMLDivElement>(null)
  // True while the list has rows below its visible part; only then does its bottom edge fade.
  const [more, setMore] = useState(false)
  const updateMore = () => {
    const list = listRef.current
    setMore(!!list && list.scrollTop + list.clientHeight < list.scrollHeight - 1)
  }

  useEffect(() => {
    updateMore()
    // Re-check once an opening or closing log has finished sliding.
    const timer = window.setTimeout(updateMore, 450)
    return () => window.clearTimeout(timer)
  }, [open, older.length])

  return (
    <Card className={`@container col-span-1 flex h-full w-full flex-col overflow-hidden !p-0 ${className}`}>
      <div className="flex items-center justify-between border-b border-border px-4.5 py-3">
        <span className="flex items-center gap-2 text-sm font-medium text-text-muted">
          <ThermometerIcon size={16} /> Uppvärmning
        </span>
        <Link href="/uppvarmning" className="whitespace-nowrap text-sm font-semibold text-link hover:text-link-hover">
          Alla loggar
        </Link>
      </div>

      {error ? (
        <p className="px-4.5 py-6 text-sm text-text-muted">Loggarna kunde inte hämtas: {error}</p>
      ) : !latest ? (
        <p className="px-4.5 py-6 text-sm text-text-muted">Inga loggar de senaste 2 timmarna.</p>
      ) : (
        <>
          <ExpandableLog
            connection={connection}
            log={latest}
            open={open === latest.timestamp}
            onToggle={toggle(latest)}
            className="shrink-0"
          >
            <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span
                className={`font-display font-semibold leading-none text-text tabular-nums transition-[font-size] ${MOTION} ${
                  listedOpen ? "text-2xl" : "text-4xl sm:text-5xl"
                }`}
              >
                {round(latest.w_avg_temperature)}°
              </span>
              {/* Beside the number when the line fits, otherwise as one whole line under it; in a narrow
                  card it steps aside while an older log is open, to give that log's zones the room. */}
              <span
                className={`min-w-[15rem] flex-1 text-sm text-text-muted tabular-nums ${listedOpen ? "hidden @lg:inline" : ""}`}
              >
                <span className="whitespace-nowrap">Börvärde {round(latest.w_avg_setpoint)}°,</span>{" "}
                <span className="whitespace-nowrap">ute {round(latest.outside_temperature)}°</span>
                {latest.mode !== null && (
                  <>
                    , <span className="whitespace-nowrap">läge {MODE_LABELS[latest.mode].toLowerCase()}</span>
                  </>
                )}
              </span>
            </span>
          </ExpandableLog>
          {older.length > 0 && (
            // Scrolls within the card; while more rows are below, the bottom edge fades to say so.
            <div
              ref={listRef}
              data-heating-list
              onScroll={updateMore}
              className={`min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
                more && !listedOpen ? "[mask-image:linear-gradient(to_bottom,black_calc(100%-1.5rem),transparent)]" : ""
              }`}
            >
              {older.map((log, index) => (
                <ExpandableLog
                  key={log.timestamp}
                  connection={connection}
                  log={log}
                  open={open === log.timestamp}
                  onToggle={toggle(log)}
                  className={index > 0 ? "border-t border-border" : ""}
                >
                  <span className="text-sm text-text-muted tabular-nums">
                    <span className="font-medium text-text">{round(log.w_avg_temperature)}°</span>, ute{" "}
                    {round(log.outside_temperature)}°
                  </span>
                </ExpandableLog>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  )
}
