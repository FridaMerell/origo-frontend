"use client"

import { useState } from "react"
import { getHeatingLogZones } from "@/app/verso/uppvarmning/_actions/residential-heating"
import { formatOneDecimal } from "@/app/lib/formatters"
import type { HeatingLog, HeatingZone } from "@/app/lib/dal"

export const MODE_LABELS: Record<number, string> = { 0: "Av", 1: "Bas", 2: "Komfort" }

export const formatTime = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })

/**
 * Shared columns for the header, the log rows and their zone rows, so a zone's temperature and
 * setpoint sit under the log's. Phones: Tid, Inne, Bör, Ute, Läge. From `sm`: also Vind and Energi.
 */
const GRID =
  "grid grid-cols-[3rem_repeat(3,minmax(0,1fr))_4.5rem] items-baseline gap-x-3 sm:grid-cols-[3.5rem_repeat(5,minmax(0,1fr))_5rem]"
const NUMBER = "text-right tabular-nums"
const WIDE_ONLY = "hidden sm:block"
const LAST_COLUMN = "col-[-2/-1] text-right"

/** Column names; `className` sets the horizontal padding to match the rows. */
export function HeatingLogHeader({ className = "" }: { className?: string }) {
  return (
    <div className={`${GRID} border-b border-border py-2 text-xs text-text-muted ${className}`}>
      <span>Tid</span>
      <span className={NUMBER}>Inne °C</span>
      <span className={NUMBER}>Bör °C</span>
      <span className={NUMBER}>Ute °C</span>
      <span className={`${NUMBER} ${WIDE_ONLY}`}>Vind</span>
      <span className={`${NUMBER} ${WIDE_ONLY}`}>Energi</span>
      <span className="text-right">Läge</span>
    </div>
  )
}

type ZoneState = { loading: true } | { loading: false; zones?: HeatingZone[]; error?: string }

function Zones({ state, className }: { state: ZoneState; className: string }) {
  const message = state.loading
    ? "Hämtar zoner..."
    : state.error
      ? `Zonerna kunde inte hämtas: ${state.error}`
      : !state.zones?.length
        ? "Inga zoner i loggen."
        : null
  if (message) return <div className={`pb-2.5 text-xs text-text-muted ${className}`}>{message}</div>

  return (
    <ul className={`m-0 list-none p-0 pb-2 text-xs text-text-muted ${className}`}>
      {[...(state.loading ? [] : state.zones ?? [])]
        .sort((a, b) => a.area_code - b.area_code)
        .map((zone) => (
          <li key={zone.area_code} className={`${GRID} py-1`}>
            <span>Zon {zone.area_code}</span>
            <span className={`${NUMBER} text-text`}>{formatOneDecimal(zone.temperature)}</span>
            <span className={NUMBER}>{formatOneDecimal(zone.setpoint)}</span>
            <span className={LAST_COLUMN}>{zone.active ? "Aktiv" : "Inaktiv"}</span>
          </li>
        ))}
    </ul>
  )
}

/**
 * One log as a button that expands to its zones. Zones only come from the log's detail endpoint,
 * so they are fetched on the first open and kept; a failed fetch is retried on the next open.
 */
export function HeatingLogRow({
  connection,
  log,
  className = "",
}: {
  connection: string
  log: HeatingLog
  /** Horizontal padding, shared by the row and its zones. */
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [zones, setZones] = useState<ZoneState | null>(null)

  async function toggle() {
    setOpen(!open)
    if (open || (zones && (zones.loading || !zones.error))) return
    if (!Number.isInteger(log.id)) {
      setZones({ loading: false, error: `ResidentialHeating skickade inget giltigt id för loggen (id: ${String(log.id)}).` })
      return
    }
    setZones({ loading: true })
    try {
      setZones({ loading: false, ...(await getHeatingLogZones(connection, log.id)) })
    } catch (err) {
      setZones({ loading: false, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <div className={`border-b border-border last:border-b-0 ${open ? "bg-surface-2" : ""}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className={`${GRID} w-full py-2.5 text-left text-sm text-text duration-150 hover:bg-surface-2 ${className}`}
      >
        <span className="text-text-muted tabular-nums">{formatTime(log.timestamp)}</span>
        <span className={`${NUMBER} font-medium`}>{formatOneDecimal(log.w_avg_temperature)}</span>
        <span className={`${NUMBER} text-text-muted`}>{formatOneDecimal(log.w_avg_setpoint)}</span>
        <span className={`${NUMBER} text-text-muted`}>{formatOneDecimal(log.outside_temperature)}</span>
        <span className={`${NUMBER} ${WIDE_ONLY} text-text-muted`}>{formatOneDecimal(log.wind_speed)}</span>
        <span className={`${NUMBER} ${WIDE_ONLY} text-text-muted`}>{formatOneDecimal(log.energy)}</span>
        <span className="text-right text-text-muted">{log.mode !== null ? MODE_LABELS[log.mode] : "–"}</span>
      </button>
      {open && zones && <Zones state={zones} className={className} />}
    </div>
  )
}
