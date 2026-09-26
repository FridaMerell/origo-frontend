import { IntegrationEditorPage } from "../integration-editor-page"
import { loadApiWorkbenchData } from "../../api/api-data"

export default async function NewIntegrationPage() {
  const data = await loadApiWorkbenchData()
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att skapa en integration.</p>
  return <IntegrationEditorPage data={data} kind="integration" backHref="/model/integrations" />
}
