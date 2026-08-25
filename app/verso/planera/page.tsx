import { cookies } from "next/headers"
import Link from "next/link"
import { FACILITY_COOKIE } from "@/app/lib/config"
import { getAllVentureTasks, getFacilities, getVentures } from "@/app/lib/dal"
import { AddVentureButton } from "@/app/verso/planera/add-venture-button"



const Venture = ({ venture }: { venture: Awaited<ReturnType<typeof getVentures>>[number] }) => {
  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1:
        return "Hög prio"
      case 2:
        return "Bör göras"
      case 3:
        return "Vore kul"
      default:
        return "Ej prio"
    }
  }
  return (
    <Link
      href={`/planera/${venture.id}`}
      className="flex flex-col gap-1 rounded border border-border p-5 w-full
    md:w-1/3 lg:w-1/4 bg-surface shadow-md hover:shadow-md transition-shadow duration-200 justify-between">
      <div>

        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">{venture.name}</h2>
          <span className="pill text-xs text-accent-active bg-accent-wash px-2 py-0.5 rounded-full">{venture.priority ? getPriorityLabel(venture.priority ?? 0) : "Unknown"}</span>
        </div>
        <p className="text-sm text-text-muted mt-2">{venture.description}</p>
      </div>
      <div>

        <hr className="my-2 border-border" />
        <div className="flex mt-4 gap-1">
          {
            (venture.budget && venture.budget > 0) ? (
              <>
                <div className="w-1/3 flex flex-col ">
                  <span className="font-semibold text-xs text-text-faint">Budget:</span>
                  <span className="text-sm font-mono">
                    {venture.budget}
                  </span>
                </div>
              </>
            ) : null
          }
          {
            (venture.total_spent && venture.total_spent > 0) ? (
              <div className="w-1/3 flex flex-col">
                <span className="font-semibold text-xs text-text-faint">Kostnad:</span>
                <span className="text-sm font-mono">
                  {venture.total_spent}
                </span>
              </div>
            ) : null
          }
          <div className="w-1/3 flex flex-col">
            <span className="font-semibold text-xs text-text-faint">Delmål:</span>
            <span className="text-sm font-mono">
              {venture.finished_tasks_count}/{venture.total_tasks_count ?? 0}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
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

  return (
    <div className="flex flex-1 flex-col gap-5 p-7">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-display font-semibold">Planering</h1>
        <AddVentureButton />
      </div>
      <section className="flex flex-row flex-wrap gap-4">
        {ventures.sort((a, b) => a.priority - b.priority).map((venture) => (
          <Venture key={venture.id} venture={venture} />
        ))}
      </section>
    </div>
  )
}
