import { ApiEditorPage } from "../../api-editor-page"
import { loadApiWorkbenchData } from "../../api-data"

export default async function NewApiResponsePage({ searchParams }: { searchParams: Promise<{ operation?: string }> }) {
  const [query, data] = await Promise.all([searchParams, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att skapa ett API-svar.</p>
  const defaultOperationId = query.operation && /^\d+$/.test(query.operation) ? Number(query.operation) : undefined
  return <ApiEditorPage data={data} kind="response" defaultOperationId={defaultOperationId} backHref={defaultOperationId ? `/model/api/operations/${defaultOperationId}` : "/model/api"} />
}
