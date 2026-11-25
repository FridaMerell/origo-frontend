import { IntegrationEditorPage } from "../integration-editor-page"
import { loadApiWorkbenchData } from "../../api/api-data"
import { modelProjectMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export function generateMetadata() {
  return modelProjectMetadata(
    (projectName) => ({
      title: `Ny integration i ${projectName} | Flux`,
      description: `Lägg till en integration mot en extern tjänst i ${projectName}.`,
    }),
    { title: "Ny integration | Flux", description: "Lägg till en integration mot en extern tjänst i projektets design." },
  )
}

export default async function NewIntegrationPage() {
  const data = await loadApiWorkbenchData()
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att skapa en integration.</p>
  return <IntegrationEditorPage data={data} kind="integration" backHref="/model/integrations" />
}
