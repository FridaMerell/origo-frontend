import type { FluxScaffoldTarget } from "@/app/lib/dal/flux"
import { ApiProjectionView } from "../../api-detail-views"
import { modelRecordMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

function targetFor(value?: string): FluxScaffoldTarget {
  return value === "django" || value === "csharp" ? value : "typescript"
}

export async function generateMetadata({ params }: { params: Promise<{ projectionId: string }> }) {
  const { projectionId } = await params
  return modelRecordMetadata(
    (design) => design.api_projections.find((item) => item.id === Number(projectionId)),
    (projection) => ({
      title: `${projection.name} | Projektion | Flux`,
      description: projection.description || `Schema och användning för projektionen ${projection.name}.`,
    }),
    {
      title: "Projektion | Flux",
      description: "Schema och användning för en återanvändbar API-projektion i projektets API-design.",
    },
  )
}

export default async function ApiProjectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectionId: string }>
  searchParams: Promise<{ target?: string; file?: string }>
}) {
  const [{ projectionId }, query] = await Promise.all([params, searchParams])
  return <ApiProjectionView id={Number(projectionId)} target={targetFor(query.target)} file={query.file} />
}
