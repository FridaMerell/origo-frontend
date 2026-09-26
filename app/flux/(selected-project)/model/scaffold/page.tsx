import { getFluxScaffold, type FluxScaffoldTarget } from "@/app/lib/dal/flux"
import Link from "next/link"
import { ApiCodeGenerator, scaffoldTargets } from "../api/api-components"
import { loadApiWorkbenchData } from "../api/api-data"

function targetFor(value: string | undefined, preferredTargets: string[]): FluxScaffoldTarget {
  if (scaffoldTargets.some((target) => target.id === value)) return value as FluxScaffoldTarget
  const preferred = preferredTargets.find((target) => scaffoldTargets.some((item) => item.id === target))
  return preferred as FluxScaffoldTarget | undefined ?? "typescript"
}

export default async function FluxScaffoldPage({
  searchParams,
}: {
  searchParams: Promise<{ target?: string; file?: string }>
}) {
  const [query, data] = await Promise.all([searchParams, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att öppna kodgeneratorn.</p>

  const stack = data.design.stack_profile
  const target = targetFor(query.target, stack?.targets ?? [])
  const scaffold = await getFluxScaffold(data.projectId, target)

  return (
    <div className="flex flex-col gap-6 pb-12">
      <header className="border-b border-border pb-5">
        <Link href="/model" className="text-sm text-text-muted hover:text-accent">Till startsekvensen</Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[.14em] text-text-faint">Flux · implementation</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-text">Kodgenerator</h1>
        <p className="mt-2 text-sm text-text-muted">Välj target, granska varenda genererad fil och skapa först därefter ett sparat scaffold-dokument.</p>
      </header>

      <dl className="grid gap-x-8 border-y border-border py-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="py-2">
          <dt className="text-xs text-text-faint">Stacktargets</dt>
          <dd className="mt-1 font-mono text-sm text-text">{stack?.targets.join(" · ") || "inte angivna"}</dd>
        </div>
        <div className="py-2">
          <dt className="text-xs text-text-faint">Databas / auth</dt>
          <dd className="mt-1 text-sm text-text">{stack ? stack.database + " · " + stack.auth_method : "ingen stackprofil"}</dd>
        </div>
        <div className="py-2">
          <dt className="text-xs text-text-faint">Designinput</dt>
          <dd className="mt-1 text-sm text-text">{data.design.entities.length} entiteter · {data.design.api_operations.length} API-operationer</dd>
        </div>
        <div className="py-2">
          <dt className="text-xs text-text-faint">Vald target</dt>
          <dd className="mt-1 font-mono text-sm text-text">{target}</dd>
        </div>
      </dl>

      <ApiCodeGenerator
        projectId={data.projectId}
        basePath="/model/scaffold"
        target={target}
        file={query.file}
        scaffold={scaffold}
        targets={scaffoldTargets}
      />

      <section className="divide-y divide-border border-y border-border">
        <div className="grid gap-2 py-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <p className="font-mono text-xs text-text">design</p>
          <p className="text-sm text-text-muted">Kräver att projektet har en vald identity.</p>
        </div>
        <div className="grid gap-2 py-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <p className="font-mono text-xs text-text">integration</p>
          <p className="text-sm text-text-muted">Kräver minst en integrationsoperation med giltig bas-URL och dess serialiserade kontrakt.</p>
        </div>
        <div className="grid gap-2 py-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <p className="font-mono text-xs text-text">scaffold-document</p>
          <p className="text-sm text-text-muted">Sparar hela target-resultatet som ett Flux-dokument först när du väljer åtgärden i generatorn.</p>
        </div>
      </section>
    </div>
  )
}
