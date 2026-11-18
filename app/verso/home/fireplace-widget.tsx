"use client"

import { useEffect, useState } from "react"
import { Card } from "@/app/components/ui/Card"
import { Drawer } from "@/app/components/ui/Drawer"
import { FireplaceHeatingForm } from "@/app/verso/uppvarmning/fireplace-heating-form"
import { formatHeatingDate, formatTime } from "@/app/verso/uppvarmning/heating-log-row"

/** The newest registered fireplace heating, loaded on the server. */
export type FireplaceNow = {
  /** ISO start time of the newest fireplace heating; null when none is registered. */
  lastStart: string | null
  error?: string
}

const LIT_WINDOW_MS = 60 * 60 * 1000

/** The time of the last fireplace heating, or "Brasan är tänd" when it was lit within the last hour. */
export function FireplaceWidget({
  connection,
  fireplace,
  className = "",
}: {
  connection: string
  fireplace: FireplaceNow
  className?: string
}) {
  const { lastStart, error } = fireplace
  const [now, setNow] = useState(() => Date.now())
  const started = lastStart ? new Date(lastStart).getTime() : null
  const lit = started !== null && now - started < LIT_WINDOW_MS

  // A new brasa arrives as new props: take the time again. Then wake up when the hour is over, so
  // "Brasan är tänd" turns into the time without a reload.
  useEffect(() => {
    setNow(Date.now())
    if (started === null) return
    const remaining = started + LIT_WINDOW_MS - Date.now()
    if (remaining <= 0) return
    const timer = window.setTimeout(() => setNow(Date.now()), remaining + 1000)
    return () => window.clearTimeout(timer)
  }, [started])

  return (
    <Card className={`col-span-1 flex h-full w-full flex-col justify-between gap-4 ${className}`}>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-medium text-text-muted">Brasa</span>
        {error ? (
          <p className="m-0 text-sm text-text-muted">Brasorna kunde inte hämtas: {error}</p>
        ) : !lastStart ? (
          <p className="m-0 text-sm text-text-muted">Ingen brasa tänd.</p>
        ) : (
          <>
            <p className="m-0 font-display text-2xl font-semibold leading-tight text-text">
              {lit ? "Brasan är tänd" : formatTime(lastStart)}
            </p>
            <p className="m-0 text-sm text-text-muted tabular-nums">
              {lit ? `Tänd ${formatTime(lastStart)}` : `Senaste brasa ${formatHeatingDate(lastStart)}`}
            </p>
          </>
        )}
      </div>
      <Drawer trigger="Tänd brasa" triggerSize="sm" triggerClassName="w-full justify-center" title="Tänd brasa">
        <FireplaceHeatingForm connection={connection} />
      </Drawer>
    </Card>
  )
}
