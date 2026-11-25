import { IntegrationEditorPage } from "../../integration-editor-page"
import { loadApiWorkbenchData } from "../../../api/api-data"
import { modelProjectMetadata, modelRecordMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ integration?: string }> }) {
  const { integration } = await searchParams
  return modelRecordMetadata(
    (design) => design.integrations.find((item) => item.id === Number(integration)),
    (found) => ({
      title: `Ny operation i ${found.name} | Flux`,
      description: `Lägg till en operation i integrationen ${found.name}, kopplad till en entitet.`,
    }),
    await modelProjectMetadata(
      (projectName) => ({
        title: `Ny integrationsoperation i ${projectName} | Flux`,
        description: `Lägg till en operation i en integration i ${projectName}, kopplad till en entitet.`,
      }),
      { title: "Ny integrationsoperation | Flux", description: "Lägg till en operation i en integration, kopplad till en entitet." },
    ),
  )
}

export default async function NewIntegrationOperationPage({ searchParams }: { searchParams: Promise<{ integration?: string }> }) {
  const [query, data] = await Promise.all([searchParams, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att skapa en integrationsoperation.</p>
  const defaultIntegrationId = query.integration && /^\d+$/.test(query.integration) ? Number(query.integration) : undefined
  return <IntegrationEditorPage data={data} kind="operation" defaultIntegrationId={defaultIntegrationId} backHref="/model/integrations" />
}
