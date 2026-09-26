import Link from "next/link"
import { notFound } from "next/navigation"
import { getFluxScaffold, type FluxScaffoldTarget } from "@/app/lib/dal/flux"
import { ApiBreadcrumb, ApiCodeGenerator, JsonContract, MethodBadge } from "../../api-components"
import { loadApiWorkbenchData } from "../../api-data"

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
  const [{ projectionId }, query, data] = await Promise.all([params, searchParams, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att öppna API Workbench.</p>

  const projection = data.design.api_projections.find((item) => item.id === Number(projectionId))
  if (!projection) notFound()
  const target = targetFor(query.target)
  const scaffold = await getFluxScaffold(data.projectId, target)
  const operationById = new Map(data.design.api_operations.map((operation) => [operation.id, operation]))
  const uses = data.design.api_operation_responses.filter((response) => response.projection === projection.id)

  return <div className="flex flex-col gap-6"><ApiBreadcrumb><span className="font-mono text-text">{projection.name}</span></ApiBreadcrumb><section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]"><article className="rounded-xl border border-border bg-surface p-5"><p className="text-xs font-semibold uppercase tracking-[.12em] text-text-faint">Återanvändbar API-projektion</p><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="mt-1 font-mono text-2xl font-semibold text-text">{projection.name}</h2><Link href={`/model/api/projections/${projection.id}/edit`} className="rounded-md border border-border px-3 py-1.5 text-sm text-text no-underline hover:bg-surface-2">Redigera projektion</Link></div>{projection.description && <p className="mt-3 text-sm leading-6 text-text-muted">{projection.description}</p>}<JsonContract label="Svarsschema" value={projection.schema} /></article><aside className="rounded-xl border border-border bg-surface p-5"><h2 className="font-semibold text-text">Används av</h2><ul className="mt-3 space-y-3">{uses.map((response) => { const operation = operationById.get(response.operation); return operation ? <li key={response.id}><Link href={`/model/api/operations/${operation.id}`} className="text-sm no-underline hover:text-accent"><MethodBadge method={operation.method} /><span className="ml-2 font-mono text-text">{operation.path}</span><span className="ml-2 text-text-muted">{response.status_code}</span></Link></li> : null })}{uses.length === 0 && <li className="text-sm text-text-muted">Ingen operation använder projektionen ännu.</li>}</ul></aside></section><ApiCodeGenerator projectId={data.projectId} basePath={`/model/api/projections/${projection.id}`} target={target} file={query.file} scaffold={scaffold} /></div>
}
