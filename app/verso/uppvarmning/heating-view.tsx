"use client"

import { useRouter } from "next/navigation"
import { groupItems } from "@/app/components/ui/GroupedList"
import { Card } from "@/app/components/ui/Card"
import { Drawer } from "@/app/components/ui/Drawer"
import { EmptyState } from "@/app/components/ui/EmptyState"
import { PageHeader } from "@/app/verso/ui/PageHeader"
import { StepperButtons } from "@/app/verso/ui/stepper-buttons"
import { ResidentialHeatingForm } from "@/app/verso/uppvarmning/residential-heating-form"
import { formatDateLong } from "@/app/lib/formatters"
import type { HeatingLog, HeatingLogPage, ResidentialHeating } from "@/app/lib/dal"

const MODE_LABELS: Record<number, string> = { 0: "Av", 1: "Bas", 2: "Komfort" }

const formatTime = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })

export default function HeatingView({
  connection,
  data,
  error,
}: {
  connection: ResidentialHeating | null
  data: HeatingLogPage | null
  error?: string
}) {
  const router = useRouter()
  // The API already returns the logs newest first.
  const groups = groupItems<HeatingLog>(data?.results ?? [], (log) => formatDateLong(log.timestamp))

  return (
    <div className="container flex min-w-0 flex-1 flex-col gap-4 py-5 sm:py-8">
      <PageHeader
        title="Uppvärmning"
        meta={connection ? `${data ? `${data.count} loggar · ` : ""}${connection.base_url} · device ${connection.device}` : undefined}
        actions={
          <Drawer
            trigger={connection ? "Ändra koppling" : "Koppla"}
            triggerSize="sm"
            triggerClassName="justify-center"
            title="ResidentialHeating"
          >
            <ResidentialHeatingForm connection={connection} />
          </Drawer>
        }
      />

      {!connection ? (
        <EmptyState>Huset är inte kopplat till ResidentialHeating.</EmptyState>
      ) : error ? (
        <EmptyState>Loggarna kunde inte hämtas: {error}</EmptyState>
      ) : groups.length === 0 ? (
        <EmptyState>Inga loggar.</EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.label} className="flex min-w-0 flex-col gap-2">
              <h2 className="m-0 px-1 font-display text-lg font-semibold leading-tight text-text">
                {group.label}
              </h2>
              <Card className="flex flex-col gap-0 overflow-hidden p-0">
                {group.items.map((log) => (
                  <div
                    key={`${log.device}-${log.timestamp}`}
                    className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:py-2.5"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm text-text">
                        {formatTime(log.timestamp)} · Inne {log.w_avg_temperature} °C (bör {log.w_avg_setpoint} °C)
                      </span>
                      <span className="truncate text-xs text-text-faint">
                        Ute {log.outside_temperature} °C · Vind {log.wind_speed}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs text-text-faint">
                      Energi {log.energy}
                      {log.mode !== null && ` · ${MODE_LABELS[log.mode]}`}
                    </span>
                  </div>
                ))}
              </Card>
            </section>
          ))}
          {data && (data.next_page || data.previous_page) && (
            <div className="flex items-center justify-end gap-3 text-xs text-text-faint">
              Sida {data.page}
              <StepperButtons
                className="flex"
                index={data.page - 1}
                length={data.next_page ? data.page + 1 : data.page}
                onIndexChange={(index) => router.push(`/uppvarmning?page=${index + 1}`)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
