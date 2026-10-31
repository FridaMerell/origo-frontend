"use client"

import { useRouter } from "next/navigation"
import { LinkButton } from "@/app/components/ui/Button"
import { Card } from "@/app/components/ui/Card"
import { EmptyState } from "@/app/components/ui/EmptyState"
import { PageHeader } from "@/app/verso/ui/PageHeader"
import { StepperButtons } from "@/app/verso/ui/stepper-buttons"
import { HeatingChart } from "@/app/verso/uppvarmning/graf/heating-chart"
import type { HeatingLogPage, ResidentialHeating } from "@/app/lib/dal"

export default function HeatingGraphView({
  connection,
  data,
  error,
}: {
  connection: ResidentialHeating | null
  data: HeatingLogPage | null
  error?: string
}) {
  const router = useRouter()
  const logs = data?.results ?? []

  return (
    <div className="container flex min-w-0 flex-1 flex-col gap-4 py-5 sm:py-8">
      <PageHeader
        title="Uppvärmning"
        meta={data ? `${logs.length} av ${data.count} loggar` : undefined}
        actions={
          <LinkButton href="/uppvarmning" variant="secondary" size="sm" className="no-underline">
            Alla loggar
          </LinkButton>
        }
      />

      {!connection ? (
        <EmptyState>Huset är inte kopplat till ResidentialHeating.</EmptyState>
      ) : error ? (
        <EmptyState>Loggarna kunde inte hämtas: {error}</EmptyState>
      ) : logs.length === 0 ? (
        <EmptyState>Inga loggar.</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          <Card className="min-w-0 p-3 sm:p-4">
            <HeatingChart logs={logs} />
          </Card>
          {data && (data.next_page || data.previous_page) && (
            <div className="flex items-center justify-end gap-3 text-xs text-text-faint">
              Sida {data.page}
              <StepperButtons
                className="flex"
                index={data.page - 1}
                length={data.next_page ? data.page + 1 : data.page}
                onIndexChange={(index) => router.push(`/uppvarmning/graf?page=${index + 1}`)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
