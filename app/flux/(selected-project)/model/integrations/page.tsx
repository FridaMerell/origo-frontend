import Link from "next/link"
import { ArrowRight, Cable, FileJson2, RefreshCw } from "lucide-react"
import { loadApiWorkbenchData } from "../api/api-data"

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

function Contract({ label, value }: { label: string; value: unknown }) {
  const rows = contractRows(value)
  const hasValue = rows.some((row) => row.value !== "tom lista" && row.value !== "tomt objekt")
  if (!hasValue) return null

  return (
    <details className="border-y border-border py-2">
      <summary className="cursor-pointer text-xs font-medium text-text-muted">{label}</summary>
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

export default async function IntegrationsPage() {
  const data = await loadApiWorkbenchData()
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att öppna integrationerna.</p>

  const { design } = data
  const entities = design.entities ?? []
  const integrations = design.integrations ?? []
  const operations = design.integration_operations ?? []
  const entityById = new Map(entities.map((entity) => [entity.id, entity]))

  return (
    <div className="flex flex-col gap-7 pb-12">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-5 sm:items-end">
        <div>
          <Link href="/model" className="text-sm text-text-muted hover:text-accent">Teknisk dokumentation</Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[.14em] text-text-faint">Externa system</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-text">Integrationer och synk</h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">Anslutning, auth och drift visas per system. Operationen leder till en visuell editor för parametrar, mappingar, pagination och sample response.</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 text-sm sm:flex sm:w-auto sm:gap-4">
          <Link href="/model/integrations/new" className="inline-flex min-h-10 items-center font-medium text-accent no-underline hover:underline">Ny integration</Link>
          <Link href="/model/integrations/operations/new" className="inline-flex min-h-10 items-center font-medium text-accent no-underline hover:underline">Ny operation</Link>
        </div>
      </header>

      <section className="border-y border-border">
        <div className="grid gap-x-8 py-3 sm:grid-cols-2">
          <p className="flex items-center justify-between text-sm text-text-muted">Integrationer <span className="font-mono text-accent">{integrations.length}</span></p>
          <p className="flex items-center justify-between text-sm text-text-muted">Operationer <span className="font-mono text-accent">{operations.length}</span></p>
        </div>
        <ul className="divide-y divide-border">
          {integrations.map((integration) => {
            const integrationOperations = operations.filter((operation) => operation.integration === integration.id)
            return (
              <li key={integration.id} id={"integration-" + integration.id} className="py-5">
                <div className="grid gap-3 sm:grid-cols-[minmax(12rem,.7fr)_minmax(0,1.4fr)_minmax(11rem,.6fr)_auto] sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <Cable size={17} className="text-accent" />
                      <h2 className="font-semibold text-text">{integration.name}</h2>
                    </div>
                    <p className="mt-1 font-mono text-xs text-text-muted">{integration.kind} · {integration.auth_type}</p>
                  </div>
                  <p className="text-sm text-text-muted">{integration.description || "Ingen beskrivning."}</p>
                  <p className="break-all font-mono text-xs text-text-muted">{integration.base_url}</p>
                  <Link href={"/model/integrations/" + integration.id + "/edit"} className="inline-flex min-h-10 items-center text-sm text-accent no-underline hover:underline">Redigera</Link>
                </div>
                <dl className="mt-4 grid gap-3 border-y border-border py-3 text-xs sm:grid-cols-3">
                  <div>
                    <dt className="text-text-faint">Miljövariabler</dt>
                    <dd className="mt-1 font-mono text-text-muted">{integration.env_vars.join(" · ") || "inga"}</dd>
                  </div>
                  <div>
                    <dt className="text-text-faint">Timeout / retries</dt>
                    <dd className="mt-1 text-text-muted">{integration.timeout_seconds}s / {integration.retries}</dd>
                  </div>
                  <div>
                    <dt className="text-text-faint">Rate limit / cache</dt>
                    <dd className="mt-1 text-text-muted">{integration.rate_limit_per_minute ?? "—"} / {integration.cache_ttl_seconds}s</dd>
                  </div>
                </dl>
                <ul className="mt-3 divide-y divide-border border-l border-border">
                  {integrationOperations.map((operation) => (
                    <li key={operation.id} className="pl-4">
                      <div className="grid gap-2 py-3 sm:grid-cols-[minmax(12rem,.7fr)_minmax(0,1fr)_12rem_auto] sm:items-center">
                        <div>
                          <p className="font-mono text-xs text-accent">{operation.method} {operation.path}</p>
                          <p className="mt-1 text-sm text-text">{operation.name}</p>
                        </div>
                        <p className="text-xs text-text-muted">
                          {operation.entity
                            ? <Link href={"/model/domain?entity=" + operation.entity + "#entity-" + operation.entity} className="text-accent no-underline hover:underline">→ {entityById.get(operation.entity)?.name ?? "#" + operation.entity}</Link>
                            : "Ingen lokal entitet"}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-text-muted">
                          <RefreshCw size={13} className="text-accent" />
                          {operation.sync ? "Synk" + (operation.sync_interval_minutes ? " / " + operation.sync_interval_minutes + " min" : "") : "Ingen synk"}
                        </p>
                        <Link href={"/model/integrations/operations/" + operation.id + "/edit"} className="inline-flex min-h-10 items-center gap-1 text-sm text-accent no-underline hover:underline">Redigera <ArrowRight size={14} /></Link>
                      </div>
                      <div className="grid gap-2 pb-3 xl:grid-cols-3">
                        <Contract label="Parametrar" value={operation.params} />
                        <Contract label="Filter" value={operation.filters} />
                        <Contract label="Mappningar" value={operation.mappings} />
                        <Contract label="Paginering" value={{ strategy: operation.pagination, config: operation.pagination_config }} />
                        <Contract label="Sample response" value={operation.sample_response} />
                      </div>
                    </li>
                  ))}
                  {integrationOperations.length === 0 && <li className="py-3 pl-4 text-sm text-text-muted">Inga operationer. <Link href={"/model/integrations/operations/new?integration=" + integration.id} className="text-accent">Skapa en operation.</Link></li>}
                </ul>
              </li>
            )
          })}
          {integrations.length === 0 && (
            <li className="py-5 text-sm text-text-muted">
              Inga integrationer är specificerade. <Link href="/model/integrations/new" className="text-accent">Skapa den första.</Link>
              <Link href="/model/scaffold?target=integration" className="ml-2 inline-flex items-center gap-1 text-accent"><FileJson2 size={14} />Se generatorns krav</Link>
            </li>
          )}
        </ul>
      </section>
    </div>
  )
}
