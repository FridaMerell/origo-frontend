import { notFound } from "next/navigation"
import { IntegrationEditorPage } from "../../../integration-editor-page"
import { loadApiWorkbenchData } from "../../../../api/api-data"

export default async function EditIntegrationOperationPage({ params }: { params: Promise<{ operationId: string }> }) {
  const [{ operationId }, data] = await Promise.all([params, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att redigera en integrationsoperation.</p>
  const operation = data.design.integration_operations.find((item) => item.id === Number(operationId))
  if (!operation) notFound()
  return <IntegrationEditorPage data={data} kind="operation" operation={operation} backHref="/model/integrations" />
}
