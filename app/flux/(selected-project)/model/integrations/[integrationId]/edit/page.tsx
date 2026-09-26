import { notFound } from "next/navigation"
import { IntegrationEditorPage } from "../../integration-editor-page"
import { loadApiWorkbenchData } from "../../../api/api-data"

export default async function EditIntegrationPage({ params }: { params: Promise<{ integrationId: string }> }) {
  const [{ integrationId }, data] = await Promise.all([params, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att redigera en integration.</p>
  const integration = data.design.integrations.find((item) => item.id === Number(integrationId))
  if (!integration) notFound()
  return <IntegrationEditorPage data={data} kind="integration" integration={integration} backHref="/model/integrations" />
}
