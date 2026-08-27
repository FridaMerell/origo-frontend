import { cookies } from "next/headers"
import { FACILITY_COOKIE } from "@/app/lib/config"
import { getAllVentureTasks, getFacilities, getVentures } from "@/app/lib/dal"
import { GroupedList, groupItems } from "@/app/components/ui/GroupedList"
import { AddVentureButton } from "@/app/verso/planera/add-venture-button"
import type { Venture } from "@/app/lib/dal"

export const metadata = {
  title: "Planering | Verso",
  description: "Planering - Origo",
}

const PRIORITY_LABEL: Record<number, string> = {
  1: "Hög prio",
  2: "Bör göras",
  3: "Vore kul",
}

export default async function PlaneraPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>
}) {
  const facilities = await getFacilities()
  const cookieStore = await cookies()
  const selectedId = cookieStore.get(FACILITY_COOKIE)?.value
  const selectedFacility =
    facilities.find((facility) => String(facility.id) === selectedId) ?? facilities[0] ?? null

  const [ventures, tasks] = await Promise.all([
    selectedFacility ? getVentures(selectedFacility.id) : Promise.resolve([]),
    getAllVentureTasks(),
  ])

  const sorted = [...ventures].sort((a, b) => a.priority - b.priority)
  const groups = groupItems(sorted, (v) => PRIORITY_LABEL[v.priority] ?? "Ej prio")

  return (
    <div className="flex flex-1 flex-col gap-4 p-7">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-display font-semibold">Planering</h1>
        <AddVentureButton />
      </div>

      <GroupedList<Venture>
        groups={groups}
        emptyMessage="Inga projekt registrerade ännu."
        getKey={(venture) => venture.id}
        getHref={(venture) => `/planera/${venture.id}`}
        renderRow={(venture) => {
          const ventureTasks = tasks.filter((t) => String(t.venture) === String(venture.id))
          const finished = ventureTasks.filter((t) => t.completed).length
          return (
            <>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-text">{venture.name}</span>
                <span className="truncate text-xs text-text-faint">{venture.description}</span>
              </span>
              <span className="flex shrink-0 items-center gap-4 text-xs text-text-faint">
                {venture.budget > 0 && (
                  <span className="font-mono text-sm text-text">
                    {venture.total_spent} / {venture.budget}
                  </span>
                )}
                <span>
                  {finished}/{ventureTasks.length} delmål
                </span>
              </span>
            </>
          )
        }}
      />
    </div>
  )
}
