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
 * setpoint sit under the log's. Narrow (phones, and always when `compact`): Tid, Inne, Bör, Ute,
 * Läge. Wide (from `sm`, not compact): also Vind and Energi.
 */
const NARROW_GRID = "grid grid-cols-[3rem_repeat(3,minmax(0,1fr))_4.5rem] items-baseline gap-x-3"
const WIDE_GRID = `${NARROW_GRID} sm:grid-cols-[3.5rem_repeat(5,minmax(0,1fr))_5rem]`
const NUMBER = "text-right tabular-nums"
const LAST_COLUMN = "col-[-2/-1] text-right"

const layout = (compact: boolean) => ({
  grid: compact ? NARROW_GRID : WIDE_GRID,
  wideOnly: compact ? "hidden" : "hidden sm:block",
})

/** Column names; `className` sets the horizontal padding to match the rows. */
export function HeatingLogHeader({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const { grid, wideOnly } = layout(compact)
  return (
    <div className={`${grid} whitespace-nowrap border-b border-border py-2 text-xs text-text-muted ${className}`}>
      <span>Tid</span>
      <span className={NUMBER}>Inne °C</span>
      <span className={NUMBER}>Bör °C</span>
      <span className={NUMBER}>Ute °C</span>
      <span className={`${NUMBER} ${wideOnly}`}>Vind</span>
      <span className={`${NUMBER} ${wideOnly}`}>Energi</span>
      <span className="text-right">Läge</span>
    </div>
  )
}

export type ZoneState = { loading: true } | { loading: false; zones?: HeatingZone[]; error?: string }

/**
 * Zones of one log. They only come from the log's detail endpoint, so `load` fetches them on
 * first use and keeps them; a failed fetch is retried on the next `load`.
 */
export function useLogZones(connection: string, log: HeatingLog) {
  const [zones, setZones] = useState<ZoneState | null>(null)

  async function load() {
    if (zones && (zones.loading || !zones.error)) return
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

  return { zones, load }
}

function Zones({ state, className, grid }: { state: ZoneState; className: string; grid: string }) {
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
          <li key={zone.area_code} className={`${grid} py-1`}>
            <span>Zon {zone.area_code}</span>
            <span className={`${NUMBER} text-text`}>{formatOneDecimal(zone.temperature)}</span>
            <span className={NUMBER}>{formatOneDecimal(zone.setpoint)}</span>
            <span className={LAST_COLUMN}>{zone.active ? "Aktiv" : "Inaktiv"}</span>
          </li>
        ))}
    </ul>
  )
}

/** One log as a button that expands to its zones. */
export function HeatingLogRow({
  connection,
  log,
  className = "",
  compact = false,
}: {
  connection: string
  log: HeatingLog
  /** Horizontal padding, shared by the row and its zones. */
  className?: string
  /** Always the narrow columns, for tight spots such as the home widget. */
  compact?: boolean
}) {
  const { grid, wideOnly } = layout(compact)
  const [open, setOpen] = useState(false)
  const { zones, load } = useLogZones(connection, log)

  function toggle() {
    setOpen(!open)
    if (!open) load()
  }

  return (
    <div className={`border-b border-border last:border-b-0 ${open ? "bg-surface-2" : ""}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className={`${grid} w-full py-2.5 text-left text-sm text-text duration-150 hover:bg-surface-2 ${className}`}
      >
        <span className="text-text-muted tabular-nums">{formatTime(log.timestamp)}</span>
        <span className={`${NUMBER} font-medium`}>{formatOneDecimal(log.w_avg_temperature)}</span>
        <span className={`${NUMBER} text-text-muted`}>{formatOneDecimal(log.w_avg_setpoint)}</span>
        <span className={`${NUMBER} text-text-muted`}>{formatOneDecimal(log.outside_temperature)}</span>
        <span className={`${NUMBER} ${wideOnly} text-text-muted`}>{formatOneDecimal(log.wind_speed)}</span>
        <span className={`${NUMBER} ${wideOnly} text-text-muted`}>{formatOneDecimal(log.energy)}</span>
        <span className="text-right text-text-muted">{log.mode !== null ? MODE_LABELS[log.mode] : "–"}</span>
      </button>
      {open && zones && <Zones state={zones} className={className} grid={grid} />}
    </div>
  )
}
