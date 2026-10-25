"use client"

import Link from "next/link"
import { ArrowUpRight, ThermometerIcon } from "lucide-react"
import { Card } from "@/app/components/ui/Card"
import type { HeatingLog } from "@/app/lib/dal"

const MODE_LABELS: Record<number, string> = { 0: "Av", 1: "Bas", 2: "Komfort" }

const formatTime = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })

/** ResidentialHeating logs from the last two hours, newest first. */
export function HeatingWidget({ logs, error }: { logs: HeatingLog[]; error?: string }) {
  const latest = logs[0]

  return (
    <Card className="col-span-1 flex min-w-0 flex-col lg:col-span-12">
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
              {latest.w_avg_temperature} °C
            </div>
            <div className="mt-2 text-sm text-text-muted">
              Bör {latest.w_avg_setpoint} °C · Ute {latest.outside_temperature} °C
              {latest.mode !== null && ` · ${MODE_LABELS[latest.mode]}`} · {formatTime(latest.timestamp)}
            </div>
          </div>

          <div className="mt-4 max-h-48 overflow-y-auto border-t border-border">
            {logs.map((log) => (
              <div
                key={`${log.device}-${log.timestamp}`}
                className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-b-0"
              >
                <span className="text-text">
                  {formatTime(log.timestamp)} · Inne {log.w_avg_temperature} °C (bör {log.w_avg_setpoint} °C)
                </span>
                <span className="shrink-0 text-xs text-text-faint">
                  Ute {log.outside_temperature} °C · Energi {log.energy}
                  {log.mode !== null && ` · ${MODE_LABELS[log.mode]}`}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
