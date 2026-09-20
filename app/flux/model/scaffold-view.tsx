"use client"

import { useEffect, useRef, useState } from "react"
import { DownloadIcon, FileTextIcon } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { CopyButton } from "@/app/components/ui/CopyButton"
import { AppLink as Link } from "@/app/components/ui/AppLink"
import { getScaffold, saveScaffoldDocument } from "@/app/actions/flux/design"
import { useFluxDocumentActions, useFluxDocuments, useSelectedFluxProject } from "@/app/flux/_state/flux-context"
import type { FluxScaffoldFile, FluxScaffoldTarget } from "@/app/lib/dal"
import { useModel } from "./model-context"
import { downloadTextFile } from "./download-file"

const TARGETS: { value: FluxScaffoldTarget; label: string; hint: string }[] = [
  { value: "django", label: "Django", hint: "Modeller" },
  { value: "typescript", label: "TypeScript", hint: "Interfaces" },
  { value: "csharp", label: "C#", hint: "Klasser" },
  { value: "skeleton", label: "Projektskelett", hint: "Repo, Docker, CI" },
]

// Only offered when the project has opted in to a visual identity; the backend refuses it otherwise.
const DESIGN_TARGET = { value: "design" as const, label: "Design", hint: "Tokens, Tailwind, stilguide" }

// These generate from the data model and are near-empty without entities; skeleton and design are not.
const DATA_MODEL_TARGETS: FluxScaffoldTarget[] = ["django", "typescript", "csharp"]

function toScaffoldState(result: Awaited<ReturnType<typeof getScaffold>>): { files: FluxScaffoldFile[]; error: string | null } {
  if (result?.error || !result?.data) return { files: [], error: result?.error ?? "Koden kunde inte genereras." }
  return { files: result.data, error: null }
}

export function ScaffoldView() {
  const { projectId, entities } = useModel()
  const documents = useFluxDocuments()
  const { addDocument, replaceDocument } = useFluxDocumentActions()
  const { selectedProject } = useSelectedFluxProject()
  const targets = selectedProject?.include_identity ? [...TARGETS, DESIGN_TARGET] : TARGETS
  const [target, setTarget] = useState<FluxScaffoldTarget>(() => (entities.length > 0 ? "typescript" : "skeleton"))
  const firstTarget = useRef(target)
  const [files, setFiles] = useState<FluxScaffoldFile[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const latestRequest = useRef(0)

  // State is only set in the response callbacks. `latestRequest` drops answers to superseded requests.
  useEffect(() => {
    const id = ++latestRequest.current
    void getScaffold(projectId, firstTarget.current).then((result) => {
      if (id !== latestRequest.current) return
      const next = toScaffoldState(result)
      setLoading(false)
      setFiles(next.files)
      setSelectedPath(next.files[0]?.path ?? null)
      setError(next.error)
    })
  }, [projectId])

  const selectTarget = (next: FluxScaffoldTarget) => {
    setTarget(next)
    setLoading(true)
    setError(null)
    setNotice(null)
    const id = ++latestRequest.current
    void getScaffold(projectId, next).then((result) => {
      if (id !== latestRequest.current) return
      const state = toScaffoldState(result)
      setLoading(false)
      setFiles(state.files)
      setSelectedPath(state.files[0]?.path ?? null)
      setError(state.error)
    })
  }

  const selected = files.find((file) => file.path === selectedPath) ?? null

  const saveAsDocument = async () => {
    const result = await saveScaffoldDocument(projectId, target)
    if (result?.error || !result?.data) {
      setNotice(result?.error ?? "Dokumentet kunde inte sparas.")
      return
    }
    // The backend updates an existing "Scaffold: <target>" document in place, so mirror that.
    const saved = result.data
    if (documents.some((document) => document.id === saved.id)) replaceDocument(saved)
    else addDocument(saved)
    setNotice("Sparat som dokument. Du hittar det bland projektets dokument.")
  }

  const needsEntities = entities.length === 0 && DATA_MODEL_TARGETS.includes(target)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Mål">
          {targets.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={item.value === target}
              onClick={() => selectTarget(item.value)}
              className={`rounded-md border px-3 py-1.5 text-left text-sm transition-colors ${
                item.value === target
                  ? "border-border-strong bg-surface-2 text-text"
                  : "border-border bg-surface text-text-muted hover:bg-surface-2/60"
              }`}
            >
              <span className="font-medium">{item.label}</span>
              <span className="ml-2 text-xs text-text-faint">{item.hint}</span>
            </button>
          ))}
        </div>
        <Button variant="secondary" size="sm" disabled={loading || files.length === 0} onClick={saveAsDocument}>
          <FileTextIcon size={14} />
          Spara som dokument
        </Button>
      </div>

      {needsEntities && (
        <p className="text-sm text-text-muted">
          Projektet har inga entiteter än, så filerna blir nästan tomma. <Link href="/model" className="underline">Skapa entiteter</Link> först.
        </p>
      )}
      {notice && <p role="status" className="text-sm text-text-muted">{notice}</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {loading && <p className="text-sm text-text-muted">Genererar…</p>}

      {!loading && !error && files.length === 0 && (
        <p className="text-sm text-text-muted">Inga filer genererades för det här målet.</p>
      )}

      {files.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <ul className="flex flex-col gap-1 self-start">
            {files.map((file) => (
              <li key={file.path}>
                <button
                  type="button"
                  onClick={() => setSelectedPath(file.path)}
                  className={`w-full truncate rounded-md px-3 py-2 text-left font-mono text-xs transition-colors ${
                    file.path === selectedPath ? "bg-surface-2 text-text" : "text-text-muted hover:bg-surface-2/60"
                  }`}
                  title={file.path}
                >
                  {file.path}
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
                <span className="truncate font-mono text-xs text-text-muted">{selected.path}</span>
                <div className="flex shrink-0 items-center gap-1">
                  <CopyButton text={selected.content} />
                  <Button variant="secondary" size="sm" onClick={() => downloadTextFile(selected.path, selected.content)}>
                    <DownloadIcon size={14} />
                    Ladda ner
                  </Button>
                </div>
              </div>
              <pre className="max-h-[36rem] overflow-auto p-4 font-mono text-xs leading-relaxed text-text">
                <code>{selected.content}</code>
              </pre>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
