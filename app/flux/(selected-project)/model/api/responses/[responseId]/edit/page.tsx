import { notFound } from "next/navigation"
import { ApiEditorPage } from "../../../api-editor-page"
import { loadApiWorkbenchData } from "../../../api-data"
import { modelRecordMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export async function generateMetadata({ params }: { params: Promise<{ responseId: string }> }) {
  const { responseId } = await params
  return modelRecordMetadata(
    (design) => {
      const response = design.api_operation_responses.find((item) => item.id === Number(responseId))
      const operation = design.api_operations.find((item) => item.id === response?.operation)
      return response && operation ? { response, operation } : undefined
    },
    ({ response, operation }) => ({
      title: `Redigera svar ${response.status_code} | ${operation.title} | Flux`,
      description: `Ändra statuskod och projektion för svaret ${response.status_code} på ${operation.method} ${operation.path}.`,
    }),
    {
      title: "Redigera svar | Flux",
      description: "Ändra statuskod och projektion för ett svar på en API-operation.",
    },
  )
}

export default async function EditApiResponsePage({ params }: { params: Promise<{ responseId: string }> }) {
  const [{ responseId }, data] = await Promise.all([params, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att redigera ett API-svar.</p>
  const response = data.design.api_operation_responses.find((item) => item.id === Number(responseId))
  if (!response) notFound()
  return <ApiEditorPage data={data} kind="response" response={response} backHref={`/model/api/operations/${response.operation}`} />
}
