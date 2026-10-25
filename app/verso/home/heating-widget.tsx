"use client"

import Link from "next/link"
import { ArrowUpRight, ThermometerIcon } from "lucide-react"
import { Card } from "@/app/components/ui/Card"
import { HeatingLogHeader, HeatingLogRow, MODE_LABELS, formatTime } from "@/app/verso/uppvarmning/heating-log-row"
import { formatOneDecimal as round } from "@/app/lib/formatters"
import type { HeatingLog } from "@/app/lib/dal"

/** ResidentialHeating logs from the last two hours, newest first; a row expands to its zones. */
export function HeatingWidget({
  connection,
  logs,
  error,
  className = "",
}: {
  connection: string
  logs: HeatingLog[]
  error?: string
  className?: string
}) {
  const latest = logs[0]

  return (
    <Card className={`col-span-1 flex h-full min-w-0 flex-col ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-text">
          <ThermometerIcon size={16} />
          Uppvärmning, senaste 2 timmarna
        </span>
        <Link href="/uppvarmning" className="inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:text-link-hover">
          Alla loggar <ArrowUpRight size={15} />
        </Link>
      </div>

      {error ? (
        <div className="mt-4 text-sm text-text-muted">Loggarna kunde inte hämtas: {error}</div>
      ) : !latest ? (
        <div className="mt-4 text-sm text-text-muted">Inga loggar de senaste 2 timmarna.</div>
      ) : (
        <>
          <div className="mt-5">
            <div className="font-display text-4xl font-semibold leading-none text-text">
              {round(latest.w_avg_temperature)} °C
            </div>
            <div className="mt-2 text-sm text-text-muted">
              Bör {round(latest.w_avg_setpoint)} °C · Ute {round(latest.outside_temperature)} °C
              {latest.mode !== null && ` · ${MODE_LABELS[latest.mode]}`} · {formatTime(latest.timestamp)}
            </div>
          </div>

          <div className="-mx-4.5 mt-4 min-h-0 flex-1 overflow-y-auto border-t border-border">
            <HeatingLogHeader className="sticky top-0 bg-surface px-4.5" />
            {logs.map((log) => (
              <HeatingLogRow key={log.timestamp} connection={connection} log={log} className="px-4.5" />
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
