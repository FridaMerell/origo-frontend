import { ApiEditorPage } from "../../api-editor-page"
import { loadApiWorkbenchData } from "../../api-data"
import { modelProjectMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export function generateMetadata() {
  return modelProjectMetadata(
    (projectName) => ({
      title: `Ny resurs i ${projectName} | Flux`,
      description: `Lägg till en API-resurs för en entitet i API-designen för ${projectName}.`,
    }),
    { title: "Ny resurs | Flux", description: "Lägg till en API-resurs för en entitet i projektets API-design." },
  )
}

export default async function NewApiResourcePage() {
  const data = await loadApiWorkbenchData()
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att skapa en API-resurs.</p>
  return <ApiEditorPage data={data} kind="resource" backHref="/model/api" />
}
