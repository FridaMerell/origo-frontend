import { ApiEditorPage } from "../../api-editor-page"
import { loadApiWorkbenchData } from "../../api-data"

export default async function NewApiProjectionPage() {
  const data = await loadApiWorkbenchData()
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att skapa en API-projektion.</p>
  return <ApiEditorPage data={data} kind="projection" backHref="/model/api" />
}
