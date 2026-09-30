import type { FluxScaffoldTarget } from "@/app/lib/dal/flux"
import { ApiOperationView } from "../../api-detail-views"

function targetFor(value?: string): FluxScaffoldTarget {
  return value === "django" || value === "csharp" ? value : "typescript"
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
