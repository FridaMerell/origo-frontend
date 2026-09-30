import type { FluxScaffoldTarget } from "@/app/lib/dal/flux"
import { ApiProjectionView } from "../../api-detail-views"

function targetFor(value?: string): FluxScaffoldTarget {
  return value === "django" || value === "csharp" ? value : "typescript"
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
