import { ApiEditorPage } from "../../api-editor-page"
import { loadApiWorkbenchData } from "../../api-data"
import { modelProjectMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export function generateMetadata() {
  return modelProjectMetadata(
    (projectName) => ({
      title: `Ny projektion i ${projectName} | Flux`,
      description: `Skapa en återanvändbar API-projektion med namn, beskrivning och schema för ${projectName}.`,
    }),
    { title: "Ny projektion | Flux", description: "Skapa en återanvändbar API-projektion med namn, beskrivning och schema." },
  )
}

export default async function NewApiProjectionPage() {
  const data = await loadApiWorkbenchData()
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att skapa en API-projektion.</p>
  return <ApiEditorPage data={data} kind="projection" backHref="/model/api" />
}
