import Link from "next/link"
import type { FluxIntegration, FluxIntegrationOperation } from "@/app/lib/dal"
import type { ApiWorkbenchData } from "../api/api-data"
import { IntegrationEditorForm } from "./integration-editor-form"
import type { IntegrationContractKind } from "./_actions/contracts"

export function IntegrationEditorPage({ data, kind, integration, operation, defaultIntegrationId, backHref }: { data: ApiWorkbenchData; kind: IntegrationContractKind; integration?: FluxIntegration; operation?: FluxIntegrationOperation; defaultIntegrationId?: number; backHref: string }) {
  const record = integration ?? operation
  const label = kind === "integration" ? "integration" : "integrationsoperation"
  return <div className="flex flex-col gap-6 pb-12"><header className="border-b border-border pb-5"><Link href={backHref} className="text-sm text-text-muted hover:text-accent">Integrationer</Link><p className="mt-4 text-xs font-semibold uppercase tracking-[.14em] text-text-faint">Externa system</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-text">{record ? `Redigera ${label}` : `Ny ${label}`}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">Fälten följer Python-serializern. Nästlade kontrakt byggs visuellt och valideras av integrationens verkliga regler vid sparning.</p></header><IntegrationEditorForm kind={kind} projectId={data.projectId} entities={data.design.entities} integrations={data.design.integrations} integration={integration} operation={operation} defaultIntegrationId={defaultIntegrationId} backHref={backHref} /></div>
}
