import type { FluxScaffoldTarget } from "@/app/lib/dal/flux"
import { ApiResourceView } from "../../api-detail-views"
import { modelRecordMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

function targetFor(value?: string): FluxScaffoldTarget {
  return value === "django" || value === "csharp" ? value : "typescript"
}

export async function generateMetadata({ params }: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await params
  return modelRecordMetadata(
    (design) => design.resources.find((item) => item.id === Number(resourceId)),
    (resource, design) => {
      const operations = design.api_operations.filter((item) => item.resource === resource.id).length
      return {
        title: `${resource.title || resource.path} | Resurs | Flux`,
        description: resource.description || `${resource.path} med ${operations} ${operations === 1 ? "operation" : "operationer"}.`,
      }
    },
    {
      title: "Resurs | Flux",
      description: "API-resursens sökväg och de operationer som hör till den.",
    },
  )
}

export default async function ApiResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ resourceId: string }>
  searchParams: Promise<{ target?: string; file?: string }>
}) {
  const [{ resourceId }, query] = await Promise.all([params, searchParams])
  return <ApiResourceView id={Number(resourceId)} target={targetFor(query.target)} file={query.file} />
}
