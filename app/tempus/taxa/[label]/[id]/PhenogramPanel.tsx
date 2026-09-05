"use client"

import { useEffect, useState } from "react"
import { loadSpeciesPhenogram } from "@/app/tempus/_actions/species"
import type { TempusPhenogram } from "@/app/lib/dal"
import Phenogram, { SeasonalStatusBadge } from "@/app/tempus/ui/Phenogram"
import { Activity, Loader } from "lucide-react"

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]

function EmptyPhenogram({ areaName }: { areaName: string }) {
  return (
    <div className="relative min-h-80 w-full overflow-hidden rounded border border-dashed border-border bg-surface-2/50 md:min-h-96">
      <svg viewBox="0 0 520 148" className="absolute inset-x-4 bottom-3 w-[calc(100%-2rem)]" aria-hidden="true">
        {[32, 66, 100].map((y) => <line key={y} x1="0" y1={y} x2="520" y2={y} stroke="var(--border)" strokeWidth="1" opacity="0.45" />)}
        <path d="M0 107 C48 106 67 97 92 89 C126 78 145 91 171 74 C198 57 220 29 252 42 C284 55 292 91 327 79 C357 69 374 47 403 58 C432 69 441 98 474 102 C492 105 505 106 520 106" fill="none" stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="5 6" opacity="0.6" />
        <line x1="0" y1="120" x2="520" y2="120" stroke="var(--border-strong)" strokeWidth="1" />
        {MONTHS.map((month, index) => {
          const x = (index / 12) * 520
          return <g key={`${month}-${index}`}><line x1={x} y1="120" x2={x} y2="125" stroke="var(--border)" strokeWidth="1" /><text x={x + 2} y="139" fontSize="8" fontFamily="monospace" fill="var(--text-faint)">{month}</text></g>
        })}
      </svg>
      <div className="relative z-10 p-5">
        <div className="flex max-w-md items-start gap-3 rounded border border-border bg-surface/90 p-4 text-left shadow-sm">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-text-muted"><Activity size={17} /></span>
          <div className="flex flex-col gap-1"><p className="font-display text-base font-semibold text-text">Aktivitetsdata saknas</p><p className="text-sm leading-relaxed text-text-muted">Ingen säsongskurva har ännu beräknats för den här arten i {areaName}.</p></div>
        </div>
      </div>
    </div>
  )
}

export default function PhenogramPanel({ id, geoAreaId, areaName }: { id: string; geoAreaId?: string; areaName: string }) {
  const [phenogram, setPhenogram] = useState<TempusPhenogram | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    loadSpeciesPhenogram(id, geoAreaId)
      .then((data) => {
        if (!cancelled) setPhenogram(data)
      })
      .catch(() => {
        if (!cancelled) setPhenogram(null)
      })
    return () => { cancelled = true }
  }, [geoAreaId, id])

  if (phenogram === undefined) return <div role="status" aria-live="polite" className="flex min-h-80 w-full flex-col items-center justify-center gap-3 rounded border border-dashed border-border bg-surface-2/50 text-text-muted md:min-h-96"><Loader size={22} className="animate-spin text-accent" /><p className="text-sm">Hämtar aktivitetsdata…</p></div>
  if (!phenogram) return <EmptyPhenogram areaName={areaName} />

  return <><SeasonalStatusBadge status={phenogram.seasonal_status} /><Phenogram phenogram={phenogram} /></>
}
