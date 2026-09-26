import { notFound } from "next/navigation"
import { loadApiWorkbenchData } from "../api/api-data"
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
      <header className="border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-text-faint">Domänmodell</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-text">
          {recordId ? "Redigera " + label : "Ny " + label}
        </h1>
        <p className="mt-2 text-sm text-text-muted">Värdena sparas direkt på designobjektet och används av scaffold-generatorn.</p>
      </header>
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
