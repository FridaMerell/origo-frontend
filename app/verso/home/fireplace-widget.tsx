"use client"

import { Card } from "@/app/components/ui/Card"
import { Drawer } from "@/app/components/ui/Drawer"
import { FireplaceHeatingForm } from "@/app/verso/uppvarmning/fireplace-heating-form"
import { formatTime } from "@/app/verso/uppvarmning/heating-log-row"
import { formatDateLong } from "@/app/lib/formatters"

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
  const started = lastStart ? new Date(lastStart) : null
  const lit = started !== null && Date.now() - started.getTime() < LIT_WINDOW_MS

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
              {lit ? `Tänd ${formatTime(lastStart)}` : `Senaste brasa ${formatDateLong(lastStart)}`}
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
