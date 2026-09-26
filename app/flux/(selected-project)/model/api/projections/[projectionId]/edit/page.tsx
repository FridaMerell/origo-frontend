import { notFound } from "next/navigation"
import { ApiEditorPage } from "../../../api-editor-page"
import { loadApiWorkbenchData } from "../../../api-data"

export default async function EditApiProjectionPage({ params }: { params: Promise<{ projectionId: string }> }) {
  const [{ projectionId }, data] = await Promise.all([params, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att redigera en API-projektion.</p>
  const projection = data.design.api_projections.find((item) => item.id === Number(projectionId))
  if (!projection) notFound()
  return <ApiEditorPage data={data} kind="projection" projection={projection} backHref={`/model/api/projections/${projection.id}`} />
}
