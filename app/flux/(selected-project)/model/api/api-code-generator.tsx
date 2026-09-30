"use client"

import { useEffect, useState } from "react"
import { FileCode2, LoaderCircle } from "lucide-react"
import type { FluxApiOperation, FluxResource, FluxScaffold, FluxScaffoldTarget } from "@/app/lib/dal"
import { useModelData, useScaffold } from "../model-data-provider"
import { ApiCodeActions } from "./api-code-actions"
import { codeTargets } from "./api-components"
import { extractTypeScriptDeclaration } from "./api-code-snippet"

function relevantFiles(target: FluxScaffoldTarget, files: FluxScaffold["files"], resource?: FluxResource, operation?: FluxApiOperation) {
  if (target === "typescript") {
    return files.filter((file) => ["types.ts", "api.ts", "api-projections.ts", "routes.ts"].includes(file.path) || file.path.includes("providers/"))
  }
  if (target === "django") {
    return files.filter((file) => /(?:models|serializers|views|urls|permissions)\.py$|API_PROJECTIONS\.md$/.test(file.path))
  }
  if (target === "csharp") {
    const entityName = resource?.entity ? String(resource.entity) : ""
    const operationPath = operation?.path ?? ""
    return files.filter((file) => file.path.includes("Models/") || file.path.includes("Controllers/") || file.path === "Data/AppDbContext.cs" || file.path === "API_PROJECTIONS.md" || (entityName && operationPath && file.content.includes(operationPath)))
  }
  return files
}

function syncUrl(target: FluxScaffoldTarget, file?: string) {
  const url = new URL(window.location.href)
  url.searchParams.set("target", target)
  if (file) url.searchParams.set("file", file)
  else url.searchParams.delete("file")
  window.history.replaceState(null, "", url)
}

export function ApiCodeGenerator({
  target: initialTarget,
  file: initialFile,
  resource,
  operation,
  focusName,
  focusFiles,
  targets = codeTargets,
}: {
  target: FluxScaffoldTarget
  file?: string
  resource?: FluxResource
  operation?: FluxApiOperation
  /** When the file bundles several declarations (e.g. api-projections.ts), show just this one's by default. */
  focusName?: string
  /** Ask the server for just these paths per target, instead of the whole target's file bundle. */
  focusFiles?: Partial<Record<FluxScaffoldTarget, string[]>>
  targets?: { id: FluxScaffoldTarget; label: string }[]
}) {
  const data = useModelData()
  const [target, setTarget] = useState(initialTarget)
  const [file, setFile] = useState(initialFile)
  const [showFullFile, setShowFullFile] = useState(!focusName)
  const requestFiles = focusFiles?.[target]
  const { scaffold, loading } = useScaffold(target, requestFiles)
  const files = scaffold ? (requestFiles ? scaffold.files : relevantFiles(target, scaffold.files, resource, operation)) : []
  const selectedFile = files.find((item) => item.path === file) ?? files[0]
  const snippet =
    focusName && target === "typescript" && selectedFile
      ? extractTypeScriptDeclaration(selectedFile.content, focusName)
      : undefined

  useEffect(() => {
    setShowFullFile(!snippet)
  }, [selectedFile?.path, snippet])

  const chooseTarget = (next: FluxScaffoldTarget) => {
    setTarget(next)
    setFile(undefined)
    syncUrl(next)
  }
  const chooseFile = (next: string) => {
    setFile(next)
    syncUrl(target, next)
  }

  return (
    <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-2 px-4 py-3.5 sm:px-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-text">
          <FileCode2 size={17} className="text-accent" aria-hidden />
          Genererad kod
          {loading && <LoaderCircle size={15} aria-label="Laddar" className="animate-spin text-text-faint" />}
        </h2>
        <div role="tablist" aria-label="Kodtarget" className="flex flex-wrap gap-2">
          {targets.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={target === item.id}
              onClick={() => chooseTarget(item.id)}
              className={"rounded-md px-2.5 py-1 text-sm " + (target === item.id ? "bg-surface font-semibold text-text shadow-sm" : "text-text-muted hover:bg-surface hover:text-text")}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {loading && !scaffold && <p className="px-4 py-4 text-sm text-text-muted sm:px-5">Genererar kod för {target}…</p>}
      {!loading && !scaffold && <p className="px-4 py-4 text-sm text-danger sm:px-5">Koden kunde inte genereras för {target}. Kontrollera kraven nedan.</p>}
      {!loading && scaffold && files.length === 0 && <p className="px-4 py-4 text-sm text-text-muted sm:px-5">Inga filer genererades för {target} än.</p>}

      {selectedFile && data && (
        <div className={"flex min-h-[28rem] flex-col transition-opacity lg:flex-row " + (loading ? "opacity-50" : "")}>
          <aside className="border-b border-border bg-surface-2/50 p-3 lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[.12em] text-text-faint">Genererade filer</p>
            <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
              {files.map((item) => (
                <li key={item.path} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => chooseFile(item.path)}
                    className={"block w-full rounded px-2 py-1.5 text-left font-mono text-xs lg:break-all " + (item.path === selectedFile.path ? "bg-accent/10 text-text" : "text-text-muted hover:bg-surface")}
                  >
                    {item.path}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
              <p className="break-all font-mono text-xs text-text-muted">{selectedFile.path}</p>
              {snippet && (
                <button
                  type="button"
                  onClick={() => setShowFullFile((current) => !current)}
                  className="shrink-0 rounded px-2 py-1 text-xs text-accent hover:bg-surface-2"
                >
                  {showFullFile ? `Visa bara ${focusName}` : "Visa hela filen"}
                </button>
              )}
            </div>
            <pre className="max-h-[38rem] overflow-auto whitespace-pre p-4 font-mono text-xs leading-5 text-text">
              {showFullFile || !snippet ? selectedFile.content : snippet}
            </pre>
            <ApiCodeActions content={selectedFile.content} path={selectedFile.path} projectId={data.projectId} target={target} />
          </div>
        </div>
      )}
    </section>
  )
}
