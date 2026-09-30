import { notFound } from "next/navigation"
import { loadApiWorkbenchData } from "../api/api-data"
import { ModelPageHeader } from "../model-ui"
import { DomainEditorForm } from "./domain-editor-form"
import type { DomainContractKind } from "./_actions/contracts"

export async function DomainEditorPage({
  kind,
  recordId,
}: {
  kind: DomainContractKind
  recordId?: number
}) {
  const data = await loadApiWorkbenchData()
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att redigera datamodellen.</p>

  const entity = kind === "entity" && recordId ? data.design.entities.find((item) => item.id === recordId) : undefined
  const field = kind === "field" && recordId ? data.design.fields.find((item) => item.id === recordId) : undefined
  const relation = kind === "relation" && recordId ? data.design.relations.find((item) => item.id === recordId) : undefined
  if (recordId && !entity && !field && !relation) notFound()

  const label = kind === "entity" ? "entitet" : kind === "field" ? "fält" : "relation"
  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModelPageHeader
        back={{ href: "/model/domain", label: "Domänmodell" }}
        title={(recordId ? "Redigera " : kind === "field" ? "Nytt " : "Ny ") + label}
        description="Ändringar sparas direkt och används när koden genereras."
      />
      <DomainEditorForm
        kind={kind}
        projectId={data.projectId}
        entities={data.design.entities}
        entity={entity}
        field={field}
        relation={relation}
      />
    </div>
  )
}
