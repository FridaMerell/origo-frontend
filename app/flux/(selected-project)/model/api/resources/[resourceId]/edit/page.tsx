import { notFound } from "next/navigation"
import { ApiEditorPage } from "../../../api-editor-page"
import { loadApiWorkbenchData } from "../../../api-data"
import { modelRecordMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export async function generateMetadata({ params }: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await params
  return modelRecordMetadata(
    (design) => design.resources.find((item) => item.id === Number(resourceId)),
    (resource) => ({
      title: `Redigera ${resource.title || resource.path} | Resurs | Flux`,
      description: `Ändra sökväg, titel och beskrivning för resursen ${resource.path}.`,
    }),
    {
      title: "Redigera resurs | Flux",
      description: "Ändra sökväg, titel och beskrivning för en API-resurs.",
    },
  )
}

export default async function EditApiResourcePage({ params }: { params: Promise<{ resourceId: string }> }) {
  const [{ resourceId }, data] = await Promise.all([params, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att redigera en API-resurs.</p>
  const resource = data.design.resources.find((item) => item.id === Number(resourceId))
  if (!resource) notFound()
  return <ApiEditorPage data={data} kind="resource" resource={resource} backHref={`/model/api/resources/${resource.id}`} />
}
