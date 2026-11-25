import type { FluxScaffoldTarget } from "@/app/lib/dal/flux"
import { ApiOperationView } from "../../api-detail-views"
import { modelRecordMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

function targetFor(value?: string): FluxScaffoldTarget {
  return value === "django" || value === "csharp" ? value : "typescript"
}

export async function generateMetadata({ params }: { params: Promise<{ operationId: string }> }) {
  const { operationId } = await params
  return modelRecordMetadata(
    (design) => design.api_operations.find((item) => item.id === Number(operationId)),
    (operation) => ({
      title: `${operation.title} | API-operation | Flux`,
      description: operation.description || `${operation.method} ${operation.path}: parametrar, schema och svar.`,
    }),
    {
      title: "API-operation | Flux",
      description: "Metod, sökväg, parametrar, schema och svar för en API-operation i projektets API-design.",
    },
  )
}

export default async function ApiOperationPage({
  params,
  searchParams,
}: {
  params: Promise<{ operationId: string }>
  searchParams: Promise<{ target?: string; file?: string }>
}) {
  const [{ operationId }, query] = await Promise.all([params, searchParams])
  return <ApiOperationView id={Number(operationId)} target={targetFor(query.target)} file={query.file} />
}
