import Link from "next/link"
import { ArrowRight, Network } from "lucide-react"
import { loadApiWorkbenchData } from "./api-data"
import { ApiSectionIndex } from "./api-section-index"
import { CrudGenerator } from "./crud-generator"

const crudKeys = ["list", "retrieve", "create", "update", "delete"] as const
const sectionIndex = [
  { id: "api-overview", label: "Översikt" },
  { id: "standard-crud", label: "Standard-CRUD" },
  { id: "api-resources", label: "API-resurser" },
  { id: "api-contracts", label: "Svarskontrakt" },
  { id: "api-providers", label: "Providers" },
]

function ApiMetric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-text-muted">{label}</dt>
      <dd className="font-mono text-lg font-semibold text-accent">{value}</dd>
    </div>
  )
}

export default async function ApiWorkbenchPage() {
  const data = await loadApiWorkbenchData()
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att öppna API-kartan.</p>

  const { design } = data
  const entities = design.entities ?? []
  const resources = design.resources ?? []
  const operations = design.api_operations ?? []
  const projections = design.api_projections ?? []
  const responses = design.api_operation_responses ?? []
  const providers = design.providers ?? []
  const resourceByEntity = new Map(resources.map((resource) => [resource.entity, resource]))
  const operationsByResource = new Map(resources.map((resource) => [
    resource.id,
    operations.filter((operation) => operation.resource === resource.id),
  ]))
  const completeCrudCount = entities.filter((entity) => {
    const resource = resourceByEntity.get(entity.id)
    const keys = new Set((resource ? operationsByResource.get(resource.id) ?? [] : []).map((operation) => operation.key))
    return crudKeys.every((key) => keys.has(key))
  }).length

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="md:hidden">
        <ApiSectionIndex sections={sectionIndex} />
      </div>

      <div className="md:grid md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8">
        <aside className="hidden md:sticky md:top-24 md:self-start md:block">
          <ApiSectionIndex sections={sectionIndex} />
        </aside>
        <main className="min-w-0 overflow-hidden rounded-card border border-border bg-surface shadow-card">
          <section id="api-overview" className="scroll-mt-24 px-4 sm:px-5">
            <dl className="grid gap-x-8 py-2 sm:grid-cols-2 xl:grid-cols-4">
              <ApiMetric value={resources.length + " / " + entities.length} label="API-resurser" />
              <ApiMetric value={completeCrudCount + " / " + entities.length} label="CRUD klart" />
              <ApiMetric value={operations.length} label="Operationer" />
              <ApiMetric value={responses.length} label="Dokumenterade svar" />
            </dl>
          </section>

      <CrudGenerator entities={entities} resources={resources} operations={operations} />

      <section id="api-resources" className="scroll-mt-24 border-t border-border">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-surface-2 px-4 py-4 sm:items-end sm:px-5">
          <div>
            <h2 className="text-xl font-semibold text-text">API-resurser</h2>
          </div>
          <nav aria-label="API-åtgärder" className="grid w-full grid-cols-2 gap-x-4 gap-y-2 text-sm sm:flex sm:w-auto sm:flex-wrap">
            <Link href="/model/api/resources/new" className="inline-flex min-h-10 items-center text-accent no-underline hover:underline">Ny resurs</Link>
            <Link href="/model/api/operations/new" className="inline-flex min-h-10 items-center text-accent no-underline hover:underline">Ny operation</Link>
            <Link href="/model/api/projections/new" className="inline-flex min-h-10 items-center text-accent no-underline hover:underline">Ny projektion</Link>
          </nav>
        </header>

        <div className="hidden grid-cols-[minmax(10rem,.8fr)_minmax(10rem,.8fr)_minmax(9rem,.65fr)_minmax(7rem,.45fr)_1.5rem] gap-4 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-[.1em] text-text-faint sm:grid">
          <span>Entitet</span>
          <span>API-resurs</span>
          <span>Standard-CRUD</span>
          <span>Operationer</span>
          <span aria-hidden />
        </div>
        <ul className="divide-y divide-border">
          {entities.map((entity) => {
            const resource = resourceByEntity.get(entity.id)
            const resourceOperations = resource ? operationsByResource.get(resource.id) ?? [] : []
            const keys = new Set(resourceOperations.map((operation) => operation.key))
            const isComplete = crudKeys.every((key) => keys.has(key))
            const crudLabel = resource ? keys.size + " / 5 operationer" : "Saknar API-resurs"

            return (
              <li key={entity.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(10rem,.8fr)_minmax(10rem,.8fr)_minmax(9rem,.65fr)_minmax(7rem,.45fr)_1.5rem] sm:items-center">
                <div className="min-w-0">
                  <p className="mb-1 text-xs text-text-faint sm:hidden">Entitet</p>
                  <Link href={"/model/domain?entity=" + entity.id + "#entity-" + entity.id} className="font-mono text-sm font-semibold text-text no-underline hover:text-accent">{entity.name}</Link>
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-xs text-text-faint sm:hidden">API-resurs</p>
                  {resource ? (
                    <Link href={"/model/api/resources/" + resource.id} className="font-mono text-sm text-text no-underline hover:text-accent">{resource.path}</Link>
                  ) : (
                    <span className="text-sm text-text-muted">Ingen resurs</span>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-xs text-text-faint sm:hidden">Standard-CRUD</p>
                  <a href="#standard-crud" className={isComplete ? "text-sm text-success hover:underline" : "text-sm text-accent hover:underline"}>{isComplete ? "Klar · " + crudLabel : crudLabel}</a>
                </div>
                <div>
                  <p className="mb-1 text-xs text-text-faint sm:hidden">Kontrakt</p>
                  <span className="font-mono text-xs text-text-muted">{resourceOperations.length} endpoints</span>
                </div>
                {resource ? (
                  <Link href={"/model/api/resources/" + resource.id} aria-label={"Öppna " + resource.path} className="hidden text-text-faint hover:text-accent sm:block"><ArrowRight size={16} /></Link>
                ) : (
                  <span className="hidden sm:block" />
                )}
              </li>
            )
          })}
          {entities.length === 0 && <li className="px-4 py-6 text-sm text-text-muted">Domänmodellen saknar Entities.</li>}
        </ul>
      </section>

      <section id="api-contracts" className="scroll-mt-24 grid gap-8 border-t border-border px-4 py-5 sm:px-5 xl:grid-cols-2">
        <div>
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Network size={18} className="text-accent" />
              <h2 className="font-semibold text-text">Svarskontrakt</h2>
            </div>
            <Link href="/model/api/projections/new" className="inline-flex min-h-10 items-center text-sm text-accent no-underline hover:underline">Ny projektion</Link>
          </header>
          <ul className="mt-3 divide-y divide-border">
            {projections.map((projection) => (
              <li key={projection.id}>
                <Link href={"/model/api/projections/" + projection.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm no-underline hover:text-accent">
                  <span className="font-mono font-medium text-text">{projection.name}</span>
                  <span className="text-xs text-text-muted">{responses.filter((response) => response.projection === projection.id).length} svar</span>
                </Link>
              </li>
            ))}
            {projections.length === 0 && <li className="py-3 text-sm text-text-muted">Inga projektioner.</li>}
          </ul>
        </div>

        <div id="api-providers" className="scroll-mt-24 border-t border-border pt-5 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-text">Providerbindningar</h2>
            <Link href="/model/frontend/providers/new" className="inline-flex min-h-10 items-center text-sm text-accent no-underline hover:underline">Ny provider</Link>
          </header>
          <ul className="mt-3 divide-y divide-border">
            {providers.map((provider) => (
              <li key={provider.id} className="py-3">
                <Link href={"/model/frontend/providers/" + provider.id} className="font-medium text-text no-underline hover:text-accent">{provider.name}</Link>
                <p className="mt-1 font-mono text-xs text-text-muted">
                  {provider.resources.map((resourceId) => resources.find((resource) => resource.id === resourceId)?.path ?? "#" + resourceId).join(" · ") || "Inga API-resurser"}
                </p>
              </li>
            ))}
            {providers.length === 0 && <li className="py-3 text-sm text-text-muted">Inga Providers.</li>}
          </ul>
        </div>
      </section>
        </main>
      </div>
    </div>
  )
}
