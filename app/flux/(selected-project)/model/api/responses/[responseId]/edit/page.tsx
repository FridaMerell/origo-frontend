import { notFound } from "next/navigation"
import { ApiEditorPage } from "../../../api-editor-page"
import { loadApiWorkbenchData } from "../../../api-data"

export default async function EditApiResponsePage({ params }: { params: Promise<{ responseId: string }> }) {
  const [{ responseId }, data] = await Promise.all([params, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att redigera ett API-svar.</p>
  const response = data.design.api_operation_responses.find((item) => item.id === Number(responseId))
  if (!response) notFound()
  return <ApiEditorPage data={data} kind="response" response={response} backHref={`/model/api/operations/${response.operation}`} />
}
