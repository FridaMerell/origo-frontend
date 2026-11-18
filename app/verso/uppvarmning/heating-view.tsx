"use client"

import { useRouter } from "next/navigation"
import { groupItems } from "@/app/components/ui/GroupedList"
import { LinkButton } from "@/app/components/ui/Button"
import { Card } from "@/app/components/ui/Card"
import { Drawer } from "@/app/components/ui/Drawer"
import { EmptyState } from "@/app/components/ui/EmptyState"
import { PageHeader } from "@/app/verso/ui/PageHeader"
import { StepperButtons } from "@/app/verso/ui/stepper-buttons"
import { ResidentialHeatingForm } from "@/app/verso/uppvarmning/residential-heating-form"
import { FireplaceHeatingForm } from "@/app/verso/uppvarmning/fireplace-heating-form"
import { HeatingLogHeader, HeatingLogRow, formatTime } from "@/app/verso/uppvarmning/heating-log-row"
import { formatDateLong } from "@/app/lib/formatters"
import type { FireplaceHeatingPage, HeatingLog, HeatingLogPage, ResidentialHeating } from "@/app/lib/dal"

export default function HeatingView({
  connection,
  data,
  error,
  fireplaces,
  fireplacesError,
}: {
  connection: ResidentialHeating | null
  data: HeatingLogPage | null
  error?: string
  fireplaces: FireplaceHeatingPage | null
  fireplacesError?: string
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
          <>
            {connection && (
              <LinkButton href="/uppvarmning/graf" variant="secondary" size="sm" className="no-underline">
                Graf
              </LinkButton>
            )}
            {connection && (
              <Drawer
                trigger="Tänd brasa"
                triggerSize="sm"
                triggerClassName="justify-center"
                title="Tänd brasa"
              >
                <FireplaceHeatingForm connection={connection.id} />
              </Drawer>
            )}
            <Drawer
              trigger={connection ? "Ändra koppling" : "Koppla"}
              triggerSize="sm"
              triggerClassName="justify-center"
              title="ResidentialHeating"
            >
              <ResidentialHeatingForm connection={connection} />
            </Drawer>
          </>
        }
      />

      {!connection ? (
        <EmptyState>Huset är inte kopplat till ResidentialHeating.</EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          <section className="flex min-w-0 flex-col gap-2">
            <h2 className="m-0 px-1 font-display text-lg font-semibold leading-tight text-text">Brasor</h2>
            {fireplacesError ? (
              <EmptyState>Brasorna kunde inte hämtas: {fireplacesError}</EmptyState>
            ) : !fireplaces?.results.length ? (
              <EmptyState>Inga brasor registrerade.</EmptyState>
            ) : (
              <Card className="flex flex-col gap-0 overflow-hidden p-0">
                {fireplaces.results.map((fireplace) => (
                  <div
                    key={fireplace.id}
                    className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-2.5 text-sm text-text last:border-b-0"
                  >
                    <span>{formatDateLong(fireplace.start_time)}</span>
                    <span className="text-text-muted tabular-nums">{formatTime(fireplace.start_time)}</span>
                  </div>
                ))}
              </Card>
            )}
          </section>
          {error ? (
            <EmptyState>Loggarna kunde inte hämtas: {error}</EmptyState>
          ) : groups.length === 0 ? (
            <EmptyState>Inga loggar.</EmptyState>
          ) : null}
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
