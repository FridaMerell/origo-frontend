import Link from "next/link"
import { Cable, FileJson2, Plus, RefreshCw } from "lucide-react"
import { loadApiWorkbenchData } from "../api/api-data"
import { ActionLink, ModelPageHeader, ModelSection, RowLink } from "../model-ui"

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
    <details className="group/contract">
      <summary className="cursor-pointer py-1 text-xs font-medium text-text-muted hover:text-text">{label}</summary>
      <dl className="mb-2 mt-1 divide-y divide-border rounded-md border border-border bg-surface">
        {rows.map((row, index) => (
          <div key={row.path + index} className="flex justify-between gap-4 px-3 py-1.5">
            <dt className="font-mono text-xs text-text-faint">{row.path}</dt>
            <dd className="min-w-0 break-words text-right font-mono text-xs text-text-muted">{row.value}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-xs">
      <dt className="text-text-faint">{label}</dt>
      <dd className="min-w-0 break-words text-right text-text-muted">{children}</dd>
    </div>
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
    <div className="flex flex-col gap-6 pb-12">
      <ModelPageHeader
        title="Integrationer"
        description="Externa system projektet pratar med: anslutning, auth, drift och de anrop som görs."
        actions={
          <>
            <ActionLink href="/model/integrations/new" variant="primary"><Plus size={15} aria-hidden /> Ny integration</ActionLink>
            <ActionLink href="/model/integrations/operations/new">Nytt anrop</ActionLink>
          </>
        }
      />

      {integrations.map((integration) => {
        const integrationOperations = operations.filter((operation) => operation.integration === integration.id)
        return (
          <ModelSection
            key={integration.id}
            id={"integration-" + integration.id}
            label={integration.name}
            icon={<Cable size={17} className="text-accent" aria-hidden />}
            title={<>{integration.name} <span className="ml-1.5 font-mono text-xs font-normal text-text-muted">{integration.kind} · {integration.auth_type}</span></>}
            actions={<RowLink href={"/model/integrations/" + integration.id + "/edit"}>Redigera</RowLink>}
          >
            <div className="px-4 py-3 sm:px-5">
              {integration.description && <p className="mb-2 text-sm text-text-muted">{integration.description}</p>}
              <dl className="divide-y divide-border">
                <Detail label="Bas-URL"><span className="font-mono">{integration.base_url || "—"}</span></Detail>
                <Detail label="Miljövariabler"><span className="font-mono">{integration.env_vars.join(", ") || "inga"}</span></Detail>
                <Detail label="Timeout och omförsök">{integration.timeout_seconds} s, {integration.retries} omförsök</Detail>
                <Detail label="Rate limit och cache">{integration.rate_limit_per_minute ? integration.rate_limit_per_minute + " per minut" : "ingen gräns"}, cache {integration.cache_ttl_seconds} s</Detail>
              </dl>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border px-4 pt-3 sm:px-5">
              <h3 className="text-xs font-semibold uppercase tracking-[.1em] text-text-faint">Anrop <span className="ml-1 font-normal normal-case tracking-normal">{integrationOperations.length}</span></h3>
              <RowLink href={"/model/integrations/operations/new?integration=" + integration.id}><Plus size={13} aria-hidden /> Anrop</RowLink>
            </div>
            <ul className="divide-y divide-border px-4 pb-2 sm:px-5">
              {integrationOperations.map((operation) => (
                <li key={operation.id} className="py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text">{operation.name}</p>
                      <p className="mt-0.5 truncate font-mono text-xs text-accent">{operation.method} {operation.path}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                        {operation.entity
                          ? <Link href={"/model/domain?entity=" + operation.entity + "#entity-" + operation.entity} className="text-text-muted no-underline hover:text-accent">Till {entityById.get(operation.entity)?.name ?? "#" + operation.entity}</Link>
                          : <span>Ingen lokal entitet</span>}
                        <span className="inline-flex items-center gap-1">
                          <RefreshCw size={12} aria-hidden />
                          {operation.sync ? "Synkas" + (operation.sync_interval_minutes ? " var " + operation.sync_interval_minutes + " min" : "") : "Ingen synk"}
                        </span>
                      </p>
                    </div>
                    <RowLink href={"/model/integrations/operations/" + operation.id + "/edit"}>Redigera</RowLink>
                  </div>
                  <div className="mt-2 flex flex-col">
                    <Contract label="Parametrar" value={operation.params} />
                    <Contract label="Filter" value={operation.filters} />
                    <Contract label="Mappningar" value={operation.mappings} />
                    <Contract label="Paginering" value={{ strategy: operation.pagination, config: operation.pagination_config }} />
                    <Contract label="Exempelsvar" value={operation.sample_response} />
                  </div>
                </li>
              ))}
              {integrationOperations.length === 0 && <li className="py-3 text-sm text-text-muted">Inga anrop än.</li>}
            </ul>
          </ModelSection>
        )
      })}

      {integrations.length === 0 && (
        <ModelSection id="integrations-empty" icon={<Cable size={17} className="text-accent" aria-hidden />} title="Inga integrationer än">
          <div className="flex flex-col gap-2 px-4 py-4 text-sm text-text-muted sm:px-5">
            <p>En integration beskriver ett externt system – till exempel ett betal-API eller ett CRM – och de anrop projektet gör mot det.</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <RowLink href="/model/integrations/new">Skapa den första</RowLink>
              <RowLink href="/model/scaffold?target=integration"><FileJson2 size={14} aria-hidden /> Se vad generatorn behöver</RowLink>
            </div>
          </div>
        </ModelSection>
      )}
    </div>
  )
}
