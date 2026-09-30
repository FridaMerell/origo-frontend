import type { FluxIntegration, FluxIntegrationOperation } from "@/app/lib/dal"
import type { ApiWorkbenchData } from "../api/api-data"
import { ModelPageHeader } from "../model-ui"
import { IntegrationEditorForm } from "./integration-editor-form"
import type { IntegrationContractKind } from "./_actions/contracts"

export function IntegrationEditorPage({ data, kind, integration, operation, defaultIntegrationId, backHref }: { data: ApiWorkbenchData; kind: IntegrationContractKind; integration?: FluxIntegration; operation?: FluxIntegrationOperation; defaultIntegrationId?: number; backHref: string }) {
  const record = integration ?? operation
  const title = kind === "integration"
    ? (record ? "Redigera integration" : "Ny integration")
    : (record ? "Redigera anrop" : "Nytt anrop")
  const description = kind === "integration"
    ? "Anslutning, inloggning och driftvärden för det externa systemet."
    : "Vad anropet skickar, hur svaret mappas till dina entiteter och om det ska synkas."
  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModelPageHeader back={{ href: backHref, label: "Integrationer" }} title={title} description={description} />
      <IntegrationEditorForm kind={kind} projectId={data.projectId} entities={data.design.entities} integrations={data.design.integrations} integration={integration} operation={operation} defaultIntegrationId={defaultIntegrationId} backHref={backHref} />
    </div>
  )
}
