"use client"

import { useMemo } from "react"
import { AppLink as Link } from "@/app/components/ui/AppLink"
import { MermaidDiagram } from "@/app/flux/documents/mermaid-diagram"
import { useModel } from "./model-context"
import { modelToMermaid } from "./model-mermaid"

export function ModelDiagramView() {
  const { entities, fields, relations } = useModel()
  const chart = useMemo(() => modelToMermaid(entities, fields, relations), [entities, fields, relations])

  if (entities.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-text-muted">
        Det finns inget att rita än. <Link href="/model" className="underline">Skapa en entitet</Link> först.
      </p>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <MermaidDiagram chart={chart} />
    </div>
  )
}
