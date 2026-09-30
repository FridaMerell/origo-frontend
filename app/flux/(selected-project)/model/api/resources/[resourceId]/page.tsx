import type { FluxScaffoldTarget } from "@/app/lib/dal/flux"
import { ApiResourceView } from "../../api-detail-views"

function targetFor(value?: string): FluxScaffoldTarget {
  return value === "django" || value === "csharp" ? value : "typescript"
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
