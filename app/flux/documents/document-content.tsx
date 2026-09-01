"use client"

import type { FluxDocument } from "@/app/lib/dal"
import { MermaidDiagram } from "./mermaid-diagram"
import { Markdown } from "./markdown"

export function DocumentContent({ document }: { document: FluxDocument }) {
  if (document.kind === "flowchart") return <MermaidDiagram chart={document.content} />

  if (document.kind === "database_schema") {
    return (
      <pre className="overflow-x-auto rounded-md border border-border bg-surface-2 p-3 font-mono text-xs leading-5 text-text">
        {document.content}
      </pre>
    )
  }

  return <Markdown content={document.content} />
}
