import { ApiEditorPage } from "../../api-editor-page"
import { loadApiWorkbenchData } from "../../api-data"
import { modelProjectMetadata, modelRecordMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ resource?: string }> }) {
  const { resource } = await searchParams
  return modelRecordMetadata(
    (design) => design.resources.find((item) => item.id === Number(resource)),
    (found) => ({
      title: `Ny operation på ${found.title || found.path} | Flux`,
      description: `Lägg till en API-operation på resursen ${found.path} med metod, sökväg, parametrar och schema.`,
    }),
    await modelProjectMetadata(
      (projectName) => ({
        title: `Ny API-operation i ${projectName} | Flux`,
        description: `Lägg till en API-operation med metod, sökväg, parametrar och schema i API-designen för ${projectName}.`,
      }),
      { title: "Ny API-operation | Flux", description: "Lägg till en API-operation med metod, sökväg, parametrar och schema i projektets API-design." },
    ),
  )
}

export default async function NewApiOperationPage({ searchParams }: { searchParams: Promise<{ resource?: string }> }) {
  const [query, data] = await Promise.all([searchParams, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att skapa en API-operation.</p>
  const defaultResourceId = query.resource && /^\d+$/.test(query.resource) ? Number(query.resource) : undefined
  return <ApiEditorPage data={data} kind="operation" defaultResourceId={defaultResourceId} backHref={defaultResourceId ? `/model/api/resources/${defaultResourceId}` : "/model/api"} />
}
