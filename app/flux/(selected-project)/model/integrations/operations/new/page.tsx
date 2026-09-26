import { IntegrationEditorPage } from "../../integration-editor-page"
import { loadApiWorkbenchData } from "../../../api/api-data"

export default async function NewIntegrationOperationPage({ searchParams }: { searchParams: Promise<{ integration?: string }> }) {
  const [query, data] = await Promise.all([searchParams, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att skapa en integrationsoperation.</p>
  const defaultIntegrationId = query.integration && /^\d+$/.test(query.integration) ? Number(query.integration) : undefined
  return <IntegrationEditorPage data={data} kind="operation" defaultIntegrationId={defaultIntegrationId} backHref="/model/integrations" />
}
