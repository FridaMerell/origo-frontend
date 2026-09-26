import { ApiEditorPage } from "../../api-editor-page"
import { loadApiWorkbenchData } from "../../api-data"

export default async function NewApiOperationPage({ searchParams }: { searchParams: Promise<{ resource?: string }> }) {
  const [query, data] = await Promise.all([searchParams, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att skapa en API-operation.</p>
  const defaultResourceId = query.resource && /^\d+$/.test(query.resource) ? Number(query.resource) : undefined
  return <ApiEditorPage data={data} kind="operation" defaultResourceId={defaultResourceId} backHref={defaultResourceId ? `/model/api/resources/${defaultResourceId}` : "/model/api"} />
}
