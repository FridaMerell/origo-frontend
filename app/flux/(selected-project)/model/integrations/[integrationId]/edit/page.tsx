import { notFound } from "next/navigation"
import { IntegrationEditorPage } from "../../integration-editor-page"
import { loadApiWorkbenchData } from "../../../api/api-data"
import { modelRecordMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export async function generateMetadata({ params }: { params: Promise<{ integrationId: string }> }) {
  const { integrationId } = await params
  return modelRecordMetadata(
    (design) => design.integrations.find((item) => item.id === Number(integrationId)),
    (integration) => ({
      title: `Redigera ${integration.name} | Integration | Flux`,
      description: `Ändra inställningar för integrationen ${integration.name}.`,
    }),
    {
      title: "Redigera integration | Flux",
      description: "Ändra inställningar för en integration mot en extern tjänst.",
    },
  )
}

export default async function EditIntegrationPage({ params }: { params: Promise<{ integrationId: string }> }) {
  const [{ integrationId }, data] = await Promise.all([params, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att redigera en integration.</p>
  const integration = data.design.integrations.find((item) => item.id === Number(integrationId))
  if (!integration) notFound()
  return <IntegrationEditorPage data={data} kind="integration" integration={integration} backHref="/model/integrations" />
}
