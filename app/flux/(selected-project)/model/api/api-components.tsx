import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { FluxScaffoldTarget } from "@/app/lib/dal"

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
