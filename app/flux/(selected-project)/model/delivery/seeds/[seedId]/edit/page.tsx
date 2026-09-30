import { notFound } from "next/navigation"
import { SeedRowEditor } from "../../../seed-row-editor"
import { loadApiWorkbenchData } from "../../../../api/api-data"
import { ModelPageHeader } from "../../../../model-ui"

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
