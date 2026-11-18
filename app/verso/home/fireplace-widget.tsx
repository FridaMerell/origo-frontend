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

/**
 * Built like the weather card: label on top, the reading large, and a ruled footer holding the action.
 * The reading is "Brasan är tänd" when the last fireplace heating was lit within the hour, otherwise its time.
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
    <Card className={`col-span-1 h-full min-w-0 ${className}`}>
      <div className="flex h-full flex-col">
        <span className="text-sm font-medium text-text-muted">Brasa</span>
        <div className="mt-3 flex items-baseline gap-3">
          {error ? (
            <span className="text-sm text-text-muted">Brasorna kunde inte hämtas: {error}</span>
          ) : !lastStart ? (
            <span className="text-sm text-text-muted">Ingen brasa tänd.</span>
          ) : (
            <>
              <span className="font-display text-3xl font-semibold leading-none text-text sm:text-4xl">
                {lit ? "Brasan är tänd" : formatTime(lastStart)}
              </span>
              <span className="ml-auto text-xs text-text-faint tabular-nums">
                {lit ? formatTime(lastStart) : formatHeatingDate(lastStart)}
              </span>
            </>
          )}
        </div>
        <div className="mt-auto border-t border-border pt-3">
          <Drawer trigger="Tänd brasa" triggerSize="sm" triggerClassName="w-full justify-center" title="Tänd brasa">
            <FireplaceHeatingForm connection={connection} />
          </Drawer>
        </div>
      </div>
    </Card>
  )
}
