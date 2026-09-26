import Link from "next/link"
import type { FluxApiOperation, FluxApiOperationResponse, FluxApiProjection, FluxResource } from "@/app/lib/dal"
import { ApiBreadcrumb } from "./api-components"
import { ApiEditorForm } from "./api-editor-form"
import { type ApiWorkbenchData } from "./api-data"
import type { ApiContractKind } from "./_actions/api-contracts"

const labels: Record<ApiContractKind, string> = {
  resource: "API-resurs",
  operation: "API-operation",
  response: "API-svar",
  projection: "API-projektion",
}

export function ApiEditorPage({
  data,
  kind,
  backHref,
  resource,
  operation,
  response,
  projection,
  defaultResourceId,
  defaultOperationId,
}: {
  data: ApiWorkbenchData
  kind: ApiContractKind
  backHref: string
  resource?: FluxResource
  operation?: FluxApiOperation
  response?: FluxApiOperationResponse
  projection?: FluxApiProjection
  defaultResourceId?: number
  defaultOperationId?: number
}) {
  const record = resource ?? operation ?? response ?? projection
  const label = labels[kind]
  return <div className="flex flex-col gap-6"><ApiBreadcrumb><Link href={backHref} className="text-text">{record ? `Redigera ${label.toLowerCase()}` : `Ny ${label.toLowerCase()}`}</Link></ApiBreadcrumb><section className="rounded-xl border border-border bg-surface p-5"><p className="text-xs font-semibold uppercase tracking-[.12em] text-text-faint">API Workbench</p><h2 className="mt-1 text-2xl font-semibold text-text">{record ? `Redigera ${label.toLowerCase()}` : `Skapa ${label.toLowerCase()}`}</h2><p className="mt-2 text-sm text-text-muted">Fälten speglar den aktuella Python-serializern och dess kontrakt.</p><div className="mt-6"><ApiEditorForm kind={kind} projectId={data.projectId} entities={data.design.entities} resources={data.design.resources} operations={data.design.api_operations} projections={data.design.api_projections} resource={resource} operation={operation} response={response} projection={projection} backHref={backHref} defaultResourceId={defaultResourceId} defaultOperationId={defaultOperationId} /></div></section></div>
}
