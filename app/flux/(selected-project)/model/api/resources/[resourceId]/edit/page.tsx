import { notFound } from "next/navigation"
import { ApiEditorPage } from "../../../api-editor-page"
import { loadApiWorkbenchData } from "../../../api-data"

export default async function EditApiResourcePage({ params }: { params: Promise<{ resourceId: string }> }) {
  const [{ resourceId }, data] = await Promise.all([params, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att redigera en API-resurs.</p>
  const resource = data.design.resources.find((item) => item.id === Number(resourceId))
  if (!resource) notFound()
  return <ApiEditorPage data={data} kind="resource" resource={resource} backHref={`/model/api/resources/${resource.id}`} />
}
