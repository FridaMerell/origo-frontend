import Link from "next/link"
import { Braces, ChevronRight, Network, RadioTower } from "lucide-react"
import { ModelSection, RowLink } from "../model-ui"
import { loadApiWorkbenchData } from "./api-data"
import { CrudGenerator } from "./crud-generator"

const crudKeys = ["list", "retrieve", "create", "update", "delete"] as const

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <li className="px-4 py-4 text-sm text-text-muted sm:px-5">{children}</li>
}

export default async function ApiWorkbenchPage() {
  const data = await loadApiWorkbenchData()
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att öppna API:t.</p>

  const { design } = data
  const entities = design.entities ?? []
  const resources = design.resources ?? []
  const operations = design.api_operations ?? []
  const projections = design.api_projections ?? []
  const responses = design.api_operation_responses ?? []
  const providers = design.providers ?? []
  const resourceByEntity = new Map(resources.map((resource) => [resource.entity, resource]))
  const resourcePath = new Map(resources.map((resource) => [resource.id, resource.path]))

  return (
    <div className="flex flex-col gap-6">
      <CrudGenerator entities={entities} resources={resources} operations={operations} />

      <ModelSection
        id="api-resources"
        label="Resurser"
        icon={<Braces size={17} className="text-accent" aria-hidden />}
        title="Resurser"
        actions={<RowLink href="/model/api/resources/new">Ny resurs</RowLink>}
      >
        <ul className="divide-y divide-border">
          {entities.map((entity) => {
            const resource = resourceByEntity.get(entity.id)
            const resourceOperations = resource ? operations.filter((operation) => operation.resource === resource.id) : []
            const keys = new Set(resourceOperations.map((operation) => operation.key))
            const done = crudKeys.filter((key) => keys.has(key)).length
            const content = (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm font-medium text-text group-hover:text-accent">{resource ? "/" + resource.path + "/" : entity.name}</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {resource ? "Entitet " + entity.name + " · " + resourceOperations.length + " endpoints" : "Entiteten saknar resurs"}
                  </p>
                </div>
                {resource && (
                  <span className={"shrink-0 rounded-full px-2 py-0.5 text-xs " + (done === 5 ? "bg-success-wash text-success" : "bg-surface-2 text-text-muted")}>
                    {done === 5 ? "CRUD klar" : "CRUD " + done + "/5"}
                  </span>
                )}
              </>
            )
            return (
              <li key={entity.id}>
                {resource ? (
                  <Link href={"/model/api/resources/" + resource.id} className="group flex items-center gap-4 px-4 py-3 no-underline hover:bg-surface-2 sm:px-5">
                    {content}
                    <ChevronRight size={16} aria-hidden className="shrink-0 text-text-faint group-hover:text-accent" />
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 px-4 py-3 sm:px-5">
                    {content}
                    <RowLink href="/model/api/resources/new">Skapa resurs</RowLink>
                  </div>
                )}
              </li>
            )
          })}
          {entities.length === 0 && (
            <EmptyRow>Inga entiteter än. <Link href="/model/domain/entities/new" className="text-accent">Skapa den första i domänmodellen</Link> – varje entitet kan sedan få en resurs.</EmptyRow>
          )}
        </ul>
      </ModelSection>

      <ModelSection
        id="api-contracts"
        label="Svarstyper"
        icon={<Network size={17} className="text-accent" aria-hidden />}
        title="Svarstyper"
        actions={<RowLink href="/model/api/projections/new">Ny svarstyp</RowLink>}
      >
        <ul className="divide-y divide-border">
          {projections.map((projection) => {
            const count = responses.filter((response) => response.projection === projection.id).length
            return (
              <li key={projection.id}>
                <Link href={"/model/api/projections/" + projection.id} className="group flex items-center gap-4 px-4 py-3 no-underline hover:bg-surface-2 sm:px-5">
                  <span className="min-w-0 flex-1 truncate font-mono text-sm font-medium text-text group-hover:text-accent">{projection.name}</span>
                  <span className="shrink-0 text-xs text-text-muted">Används i {count} svar</span>
                  <ChevronRight size={16} aria-hidden className="shrink-0 text-text-faint group-hover:text-accent" />
                </Link>
              </li>
            )
          })}
          {projections.length === 0 && <EmptyRow>Inga svarstyper än. De beskriver återanvändbara svar, till exempel en lista med förenklade objekt.</EmptyRow>}
        </ul>
      </ModelSection>

      <ModelSection
        id="api-providers"
        label="Providers"
        icon={<RadioTower size={17} className="text-accent" aria-hidden />}
        title="Providers"
        actions={<RowLink href="/model/frontend/providers/new">Ny provider</RowLink>}
      >
        <ul className="divide-y divide-border">
          {providers.map((provider) => (
            <li key={provider.id}>
              <Link href={"/model/frontend/providers/" + provider.id} className="group flex items-center gap-4 px-4 py-3 no-underline hover:bg-surface-2 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text group-hover:text-accent">{provider.name}</p>
                  <p className="mt-0.5 truncate font-mono text-xs text-text-muted">
                    {provider.resources.map((id) => resourcePath.get(id) ?? "#" + id).join(" · ") || "Inga resurser valda"}
                  </p>
                </div>
                <ChevronRight size={16} aria-hidden className="shrink-0 text-text-faint group-hover:text-accent" />
              </Link>
            </li>
          ))}
          {providers.length === 0 && <EmptyRow>Inga providers än. En provider kopplar frontendens dataflöde till valda resurser.</EmptyRow>}
        </ul>
      </ModelSection>
    </div>
  )
}
