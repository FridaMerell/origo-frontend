import { ApiEditorPage } from "../../api-editor-page"
import { loadApiWorkbenchData } from "../../api-data"
import { modelProjectMetadata, modelRecordMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ operation?: string }> }) {
  const { operation } = await searchParams
  return modelRecordMetadata(
    (design) => design.api_operations.find((item) => item.id === Number(operation)),
    (found) => ({
      title: `Nytt svar på ${found.title} | Flux`,
      description: `Lägg till ett statussvar med valfri projektion på ${found.method} ${found.path}.`,
    }),
    await modelProjectMetadata(
      (projectName) => ({
        title: `Nytt svar i ${projectName} | Flux`,
        description: `Lägg till ett statussvar med valfri projektion på en API-operation i ${projectName}.`,
      }),
      { title: "Nytt svar | Flux", description: "Lägg till ett statussvar med valfri projektion på en API-operation." },
    ),
  )
}

export default async function NewApiResponsePage({ searchParams }: { searchParams: Promise<{ operation?: string }> }) {
  const [query, data] = await Promise.all([searchParams, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att skapa ett API-svar.</p>
  const defaultOperationId = query.operation && /^\d+$/.test(query.operation) ? Number(query.operation) : undefined
  return <ApiEditorPage data={data} kind="response" defaultOperationId={defaultOperationId} backHref={defaultOperationId ? `/model/api/operations/${defaultOperationId}` : "/model/api"} />
}
