import { ApiEditorPage } from "../../api-editor-page"
import { loadApiWorkbenchData } from "../../api-data"

export default async function NewApiResourcePage() {
  const data = await loadApiWorkbenchData()
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att skapa en API-resurs.</p>
  return <ApiEditorPage data={data} kind="resource" backHref="/model/api" />
}
