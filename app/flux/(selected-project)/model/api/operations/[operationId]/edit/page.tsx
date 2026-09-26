import { notFound } from "next/navigation"
import { ApiEditorPage } from "../../../api-editor-page"
import { loadApiWorkbenchData } from "../../../api-data"

export default async function EditApiOperationPage({ params }: { params: Promise<{ operationId: string }> }) {
  const [{ operationId }, data] = await Promise.all([params, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att redigera en API-operation.</p>
  const operation = data.design.api_operations.find((item) => item.id === Number(operationId))
  if (!operation) notFound()
  return <ApiEditorPage data={data} kind="operation" operation={operation} backHref={`/model/api/operations/${operation.id}`} />
}
