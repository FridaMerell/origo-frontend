import Link from "next/link"
import { ChevronRight, FileCode2 } from "lucide-react"
import type { FluxApiOperation, FluxResource, FluxScaffold, FluxScaffoldTarget } from "@/app/lib/dal"
import { ApiCodeActions } from "./api-code-actions"

export const codeTargets: { id: FluxScaffoldTarget; label: string }[] = [
  { id: "django", label: "Django" },
  { id: "typescript", label: "TypeScript" },
  { id: "csharp", label: "C#" },
]

export const scaffoldTargets: { id: FluxScaffoldTarget; label: string }[] = [
  ...codeTargets,
  { id: "design", label: "Design tokens" },
  { id: "integration", label: "Integration" },
  { id: "skeleton", label: "Skeleton" },
]

export function MethodBadge({ method }: { method: string }) {
  return <span className="rounded bg-accent/10 px-2 py-0.5 font-mono text-xs font-semibold text-accent">{method}</span>
}

type ContractRow = { path: string; value: string }

function contractRows(value: unknown, path = ""): ContractRow[] {
  if (value === null) return [{ path: path || "värde", value: "null" }]
  if (Array.isArray(value)) {
    if (value.length === 0) return [{ path: path || "värde", value: "tom lista" }]
    return value.flatMap((item, index) => contractRows(item, path ? path + "[" + index + "]" : "[" + index + "]"))
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return [{ path: path || "värde", value: "tomt objekt" }]
    return entries.flatMap(([key, item]) => contractRows(item, path ? path + "." + key : key))
  }
  return [{ path: path || "värde", value: String(value) }]
}

export function JsonContract({ label, value }: { label: string; value: unknown }) {
  const rows = contractRows(value)
  const hasValue = rows.some((row) => row.value !== "tom lista" && row.value !== "tomt objekt")
  if (!hasValue) return <p className="mt-2 text-sm text-text-muted">Inget {label.toLowerCase()} har specificerats.</p>

  return (
    <details className="mt-3 border-y border-border py-3">
      <summary className="cursor-pointer text-sm font-medium text-text">{label}</summary>
      <dl className="mt-3 divide-y divide-border">
        {rows.map((row, index) => (
          <div key={row.path + index} className="grid gap-1 py-2 sm:grid-cols-[minmax(7rem,.7fr)_minmax(0,1fr)]">
            <dt className="font-mono text-xs text-text-faint">{row.path}</dt>
            <dd className="break-words font-mono text-xs text-text-muted">{row.value}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}

export function ApiBreadcrumb({ children }: { children: React.ReactNode }) {
  return (
    <nav aria-label="Brödsmulor" className="flex flex-wrap items-center gap-1.5 text-sm text-text-muted">
      <Link href="/model/api" className="hover:text-text">API-karta</Link>
      <ChevronRight size={15} aria-hidden />
      {children}
    </nav>
  )
}

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

export function ApiCodeGenerator({
  projectId,
  basePath,
  target,
  file,
  scaffold,
  resource,
  operation,
  targets = codeTargets,
}: {
  projectId: string
  basePath: string
  target: FluxScaffoldTarget
  file?: string
  scaffold: FluxScaffold | null
  resource?: FluxResource
  operation?: FluxApiOperation
  targets?: { id: FluxScaffoldTarget; label: string }[]
}) {
  const files = scaffold ? relevantFiles(target, scaffold.files, resource, operation) : []
  const selectedFile = files.find((item) => item.path === file) ?? files[0]
  const query = (nextTarget: FluxScaffoldTarget, nextFile?: string) =>
    basePath + "?target=" + nextTarget + (nextFile ? "&file=" + encodeURIComponent(nextFile) : "")

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-surface-2 px-4 py-4">
        <div className="flex items-center gap-2">
          <FileCode2 size={18} className="text-accent" />
          <h2 className="font-semibold text-text">Implementationsgenerator</h2>
        </div>
        <nav aria-label="Kodtarget" className="flex flex-wrap gap-2">
          {targets.map((item) => (
            <Link
              key={item.id}
              href={query(item.id)}
              className={"rounded-md border px-2.5 py-1 text-sm no-underline " + (target === item.id ? "border-accent bg-accent/10 text-text" : "border-border text-text-muted hover:bg-surface")}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {!scaffold && <p className="p-4 text-sm text-danger">Flux kunde inte generera {target}-underlaget för den här designen.</p>}
      {scaffold && files.length === 0 && <p className="p-4 text-sm text-text-muted">Generatorn returnerade inga API-relevanta filer för target {target}.</p>}

      {selectedFile && (
        <div className="grid min-h-[28rem] lg:grid-cols-[13rem_minmax(0,1fr)]">
          <aside className="border-b border-border bg-surface-2 p-3 lg:border-b-0 lg:border-r">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[.12em] text-text-faint">Genererade filer</p>
            <ul className="space-y-1">
              {files.map((item) => (
                <li key={item.path}>
                  <Link
                    href={query(target, item.path)}
                    className={"block break-all rounded px-2 py-1.5 font-mono text-xs no-underline " + (item.path === selectedFile.path ? "bg-accent/10 text-text" : "text-text-muted hover:bg-surface")}
                  >
                    {item.path}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
          <div className="min-w-0">
            <div className="border-b border-border px-4 py-3">
              <p className="font-mono text-xs text-text-muted">{selectedFile.path}</p>
            </div>
            <pre className="max-h-[38rem] overflow-auto whitespace-pre p-4 font-mono text-xs leading-5 text-text">{selectedFile.content}</pre>
            <ApiCodeActions content={selectedFile.content} path={selectedFile.path} projectId={projectId} target={target} />
          </div>
        </div>
      )}
    </section>
  )
}
