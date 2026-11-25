import { SeedRowEditor } from "../../seed-row-editor"
import { loadApiWorkbenchData } from "../../../api/api-data"
import { ModelPageHeader } from "../../../model-ui"
import { modelProjectMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export function generateMetadata() {
  return modelProjectMetadata(
    (projectName) => ({
      title: `Ny seed-rad i ${projectName} | Flux`,
      description: `Lägg till en rad med seed-data för en av entiteterna i ${projectName}.`,
    }),
    { title: "Ny seed-rad | Flux", description: "Lägg till en rad med seed-data för en av projektets entiteter." },
  )
}

export default async function NewSeedRowPage() {
  const data = await loadApiWorkbenchData()
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att skapa startvärden.</p>
  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModelPageHeader back={{ href: "/model/delivery", label: "Leverans" }} title="Nytt startvärde" description="Välj entitet och fyll i dess fält och relationer." />
      <SeedRowEditor entities={data.design.entities} fields={data.design.fields} relations={data.design.relations} />
    </div>
  )
}
