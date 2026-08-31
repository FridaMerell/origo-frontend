"use client"

import { useState } from "react"
import { Card } from "@/app/components/ui/Card"
import { Button } from "@/app/components/ui/Button"
import { Icon } from "@/app/components/ui/Icon"
import type { FluxDocument, FluxMilestone, FluxTask } from "@/app/lib/dal"
import { DocumentContent } from "./document-content"
import { DocumentEditorOverlay } from "./document-editor-overlay"
import { downloadMarkdown } from "./download"

const LEGACY_KIND_LABELS = {
  markdown: "Dokument",
  flowchart: "Flödesschema",
  database_schema: "Databasschema",
} as const

function documentMeta(document: FluxDocument) {
  if (document.kind !== "markdown") {
    return { icon: document.kind === "flowchart" ? "git-fork" : "database", label: LEGACY_KIND_LABELS[document.kind] }
  }
  const hasDiagram = /```(mermaid|dbschema)/.test(document.content)
  return { icon: hasDiagram ? "layout-panel-left" : "file-text", label: hasDiagram ? "Dokument + diagram" : "Dokument" }
}

function DocumentCard({ document, location, onEdit }: { document: FluxDocument; location: string; onEdit: () => void }) {
  const meta = documentMeta(document)
  return (
    <Card className="gap-3 p-4">
      <details>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <Icon name={meta.icon} size={16} className="text-text-muted" />
            <span className="truncate font-semibold text-text">{document.title}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={(event) => { event.preventDefault(); downloadMarkdown(document.title, document.content) }} className="rounded p-1 text-text-muted hover:bg-surface-2 hover:text-text" aria-label="Ladda ner som Markdown">
              <Icon name="download" size={14} />
            </button>
            <button type="button" onClick={(event) => { event.preventDefault(); onEdit() }} className="rounded p-1 text-text-muted hover:bg-surface-2 hover:text-text" aria-label="Redigera dokument">
              <Icon name="pencil" size={14} />
            </button>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-text-muted">{meta.label}</span>
          </span>
        </summary>
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-3 text-xs text-text-faint">{location}</p>
          <DocumentContent document={document} />
        </div>
      </details>
    </Card>
  )
}

export function DocumentsSection({
  projectId,
  documents,
  milestones,
  tasks,
}: {
  projectId: number
  documents: FluxDocument[]
  milestones: FluxMilestone[]
  tasks: FluxTask[]
}) {
  const [editingDocument, setEditingDocument] = useState<FluxDocument | "new" | null>(null)
  const milestonesById = new Map(milestones.map((milestone) => [milestone.id, milestone.title]))
  const tasksById = new Map(tasks.map((task) => [task.id, task.title]))

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-base font-semibold text-text-muted">Dokument</h2>
        <Button variant="secondary" size="sm" onClick={() => setEditingDocument("new")}>
          <Icon name="plus" size={14} /> Nytt dokument
        </Button>
      </div>

      {documents.length === 0 ? <p className="text-sm text-text-muted">Inga dokument än.</p> : (
        <div className="flex flex-col gap-3">
          {documents.map((document) => {
            const location = document.milestone
              ? `Milstolpe: ${milestonesById.get(document.milestone) ?? "Okänd"}`
              : document.task
                ? `Uppgift: ${tasksById.get(document.task) ?? "Okänd"}`
                : "Projekt"
            return <DocumentCard key={document.id} document={document} location={location} onEdit={() => setEditingDocument(document)} />
          })}
        </div>
      )}

      {editingDocument && (
        <DocumentEditorOverlay
          onClose={() => setEditingDocument(null)}
          projectId={projectId}
          milestones={milestones}
          tasks={tasks}
          document={editingDocument === "new" ? undefined : editingDocument}
        />
      )}
    </section>
  )
}
