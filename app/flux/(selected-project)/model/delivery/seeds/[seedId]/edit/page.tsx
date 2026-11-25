import { notFound } from "next/navigation"
import { SeedRowEditor } from "../../../seed-row-editor"
import { loadApiWorkbenchData } from "../../../../api/api-data"
import { ModelPageHeader } from "../../../../model-ui"
import { modelRecordMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export async function generateMetadata({ params }: { params: Promise<{ seedId: string }> }) {
  const { seedId } = await params
  return modelRecordMetadata(
    (design) => {
      const row = design.seed_rows.find((item) => item.id === Number(seedId))
      const entity = design.entities.find((item) => item.id === row?.entity)
      return row && entity ? { row, entity } : undefined
    },
    ({ row, entity }) => ({
      title: `Redigera seed-rad ${row.order} | ${entity.name} | Flux`,
      description: `Ändra seed-data för entiteten ${entity.name}.`,
    }),
    {
      title: "Redigera seed-rad | Flux",
      description: "Ändra en rad med seed-data för projektets entiteter.",
    },
  )
}

export default async function EditSeedRowPage({ params }: { params: Promise<{ seedId: string }> }) {
  const [{ seedId }, data] = await Promise.all([params, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att redigera startvärden.</p>
  const row = data.design.seed_rows.find((item) => item.id === Number(seedId))
  if (!row) notFound()
  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModelPageHeader back={{ href: "/model/delivery", label: "Leverans" }} title="Redigera startvärde" />
      <SeedRowEditor entities={data.design.entities} fields={data.design.fields} relations={data.design.relations} row={row} />
    </div>
  )
}
