import { notFound } from "next/navigation"
import { IntegrationEditorPage } from "../../../integration-editor-page"
import { loadApiWorkbenchData } from "../../../../api/api-data"
import { modelRecordMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export async function generateMetadata({ params }: { params: Promise<{ operationId: string }> }) {
  const { operationId } = await params
  return modelRecordMetadata(
    (design) => {
      const operation = design.integration_operations.find((item) => item.id === Number(operationId))
      const integration = design.integrations.find((item) => item.id === operation?.integration)
      return operation && integration ? { operation, integration } : undefined
    },
    ({ operation, integration }) => ({
      title: `Redigera ${operation.name} | ${integration.name} | Flux`,
      description: `Ändra anrop, entitet och fältkoppling för ${operation.method} ${operation.path} i ${integration.name}.`,
    }),
    {
      title: "Redigera integrationsoperation | Flux",
      description: "Ändra anrop, entitet och fältkoppling för en operation i en integration.",
    },
  )
}

export default async function EditIntegrationOperationPage({ params }: { params: Promise<{ operationId: string }> }) {
  const [{ operationId }, data] = await Promise.all([params, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att redigera en integrationsoperation.</p>
  const operation = data.design.integration_operations.find((item) => item.id === Number(operationId))
  if (!operation) notFound()
  return <IntegrationEditorPage data={data} kind="operation" operation={operation} backHref="/model/integrations" />
}
