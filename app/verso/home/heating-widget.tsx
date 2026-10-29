"use client"

import { Fragment, useRef, useState, type ReactNode } from "react"
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

/**
 * A log laid out the same way at any size: its values on the left, its time and a "Zoner"/"Dölj"
 * cue on the right. Opening slides its zones out underneath; nothing around it moves except down.
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
      // After the slide-out, bring the opened zones into view inside the list.
      window.setTimeout(() => ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 220)
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
        className="flex w-full cursor-pointer items-baseline gap-4 px-4.5 py-2 text-left @lg:py-3"
      >
        <span className="min-w-0 flex-1">{children}</span>
        <span className="text-xs text-text-faint tabular-nums">{formatTime(log.timestamp)}</span>
        <span className="w-10 text-right text-sm font-semibold text-link">{open ? "Dölj" : "Zoner"}</span>
      </button>
      {/* Height animates from 0 to the content's own height; the zones stay mounted once loaded. */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          {zones && (
            <p className="-mt-1 mb-0 max-w-prose px-4.5 pb-2 text-sm text-text-muted tabular-nums @lg:pb-3">
              {zones.loading
                ? "Hämtar zoner..."
                : zones.error
                  ? `Zonerna kunde inte hämtas: ${zones.error}`
                  : !sorted.length
                    ? "Inga zoner i loggen."
                    : sorted.map((zone, index) => (
                        <Fragment key={zone.area_code}>
                          {index > 0 && ", "}
                          <span className="whitespace-nowrap">
                            Zon {zone.area_code} <span className="text-text">{round(zone.temperature)}°</span> bör{" "}
                            {round(zone.setpoint)}°{zone.active && " aktiv"}
                          </span>
                        </Fragment>
                      ))}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * The newest log as the current reading at the weather card's size, fixed at the top; under it every
 * other log of the last two hours in a list that scrolls within the card. Opening a log slides its
 * zones out in place; no log is ever hidden or reordered.
 */
export function HeatingWidget({ heating, className = "" }: { heating: HeatingNow; className?: string }) {
  const { connection, logs, error } = heating
  const [latest, ...older] = logs
  const [open, setOpen] = useState<string | null>(null)
  const toggle = (log: HeatingLog) => () => setOpen(open === log.timestamp ? null : log.timestamp)

  return (
    <Card className={`@container col-span-1 flex h-full w-full flex-col overflow-hidden !p-0 ${className}`}>
      <div className="flex items-center justify-between border-b border-border px-4.5 py-3.5">
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
              <span className="font-display text-4xl font-semibold leading-none text-text tabular-nums sm:text-5xl">
                {round(latest.w_avg_temperature)}°
              </span>
              {/* Beside the number when the line fits, otherwise as one whole line under it. */}
              <span className="min-w-[15rem] flex-1 text-sm text-text-muted tabular-nums">
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
            // Scrolls within the card; the bottom edge fades so a row cut by the edge reads as "more below".
            <div className="min-h-0 flex-1 scroll-pb-3 overflow-y-auto overscroll-contain border-t border-border pb-2 [mask-image:linear-gradient(to_bottom,black_calc(100%-1.5rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
