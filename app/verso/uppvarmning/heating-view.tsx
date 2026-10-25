"use client"

import { useRouter } from "next/navigation"
import { groupItems } from "@/app/components/ui/GroupedList"
import { Card } from "@/app/components/ui/Card"
import { Drawer } from "@/app/components/ui/Drawer"
import { EmptyState } from "@/app/components/ui/EmptyState"
import { PageHeader } from "@/app/verso/ui/PageHeader"
import { StepperButtons } from "@/app/verso/ui/stepper-buttons"
import { ResidentialHeatingForm } from "@/app/verso/uppvarmning/residential-heating-form"
import { HeatingLogHeader, HeatingLogRow } from "@/app/verso/uppvarmning/heating-log-row"
import { formatDateLong } from "@/app/lib/formatters"
import type { HeatingLog, HeatingLogPage, ResidentialHeating } from "@/app/lib/dal"

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
        meta={
          connection
            ? `${data ? `${data.count} ${data.count === 1 ? "logg" : "loggar"} · ` : ""}${connection.base_url} · device ${connection.device}`
            : undefined
        }
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
                <HeatingLogHeader className="px-4" />
                {group.items.map((log) => (
                  <HeatingLogRow key={log.timestamp} connection={connection.id} log={log} className="px-4" />
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
