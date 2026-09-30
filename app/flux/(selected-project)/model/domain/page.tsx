import Link from "next/link"
import { ChevronRight, Database, GitBranch, Plus } from "lucide-react"
import { loadApiWorkbenchData } from "../api/api-data"
import { ActionLink, ModelPageHeader, ModelSection, RowLink } from "../model-ui"

function SubHeading({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-[.1em] text-text-faint">{children}</h3>
      {action}
    </div>
  )
}

export default async function DomainModelPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string }>
}) {
  const [data, query] = await Promise.all([loadApiWorkbenchData(), searchParams])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att öppna domänmodellen.</p>

  const { design } = data
  const entities = design.entities ?? []
  const fields = design.fields ?? []
  const relations = design.relations ?? []
  const resources = design.resources ?? []
  const entityById = new Map(entities.map((entity) => [entity.id, entity]))
  const selectedEntityId = Number(query.entity)
  const entityHref = (id: number) => "/model/domain?entity=" + id + "#entity-" + id

  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModelPageHeader
        title="Domänmodell"
        description="Entiteterna projektet äger, deras fält och hur de hänger ihop."
        actions={
          <>
            <ActionLink href="/model/domain/entities/new" variant="primary"><Plus size={15} aria-hidden /> Ny entitet</ActionLink>
            <ActionLink href="/model/domain/fields/new">Nytt fält</ActionLink>
            <ActionLink href="/model/domain/relations/new">Ny relation</ActionLink>
          </>
        }
      />

      <ModelSection
        id="domain-entities"
        label="Entiteter"
        icon={<Database size={17} className="text-accent" aria-hidden />}
        title={<>Entiteter <span className="ml-1 text-sm font-normal text-text-muted">{entities.length}</span></>}
      >
        <ul className="divide-y divide-border">
          {entities.map((entity) => {
            const entityFields = fields.filter((field) => field.entity === entity.id).sort((a, b) => a.order - b.order)
            const entityRelations = relations.filter((relation) => relation.source === entity.id)
            const resource = resources.find((item) => item.entity === entity.id)

            return (
              <li key={entity.id}>
                <details id={"entity-" + entity.id} open={selectedEntityId === entity.id} className="group scroll-mt-24">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-surface-2 sm:px-5 [&::-webkit-details-marker]:hidden">
                    <ChevronRight size={16} aria-hidden className="shrink-0 text-text-faint transition-transform group-open:rotate-90" />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-semibold text-text">{entity.name}</p>
                      <p className="mt-0.5 truncate text-xs text-text-muted">{entity.description || "Ingen beskrivning"}</p>
                    </div>
                    <span className="shrink-0 text-xs text-text-muted">{entityFields.length} fält · {entityRelations.length} relationer</span>
                  </summary>

                  <div className="flex flex-col gap-5 border-t border-border bg-bg/40 px-4 py-4 sm:pl-12 sm:pr-5">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <RowLink href={"/model/domain/entities/" + entity.id + "/edit"}>Redigera entitet</RowLink>
                      {resource
                        ? <RowLink href={"/model/api/resources/" + resource.id}>API: /{resource.path}/</RowLink>
                        : <RowLink href="/model/api/resources/new">Skapa API-resurs</RowLink>}
                    </div>

                    <section>
                      <SubHeading action={<RowLink href="/model/domain/fields/new"><Plus size={13} aria-hidden /> Fält</RowLink>}>Fält</SubHeading>
                      <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-surface">
                        {entityFields.map((field) => (
                          <li key={field.id}>
                            <Link href={"/model/domain/fields/" + field.id + "/edit"} className="group/row flex items-center justify-between gap-4 px-3 py-2 no-underline hover:bg-surface-2">
                              <span className="font-mono text-sm text-text group-hover/row:text-accent">{field.name}</span>
                              <span className="truncate font-mono text-xs text-text-muted">
                                {field.type}{field.nullable ? " | null" : ""}{field.unique ? " · unik" : ""}{field.default ? " · standard " + field.default : ""}
                              </span>
                            </Link>
                          </li>
                        ))}
                        {entityFields.length === 0 && <li className="px-3 py-2 text-sm text-text-muted">Inga fält än.</li>}
                      </ul>
                    </section>

                    <section>
                      <SubHeading action={<RowLink href="/model/domain/relations/new"><Plus size={13} aria-hidden /> Relation</RowLink>}>Relationer</SubHeading>
                      <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-surface">
                        {entityRelations.map((relation) => (
                          <li key={relation.id} className="flex items-center justify-between gap-4 px-3 py-2">
                            <Link href={"/model/domain/relations/" + relation.id + "/edit"} className="min-w-0 no-underline">
                              <span className="font-mono text-sm text-text hover:text-accent">{relation.name}</span>
                              <span className="ml-2 text-xs text-text-faint">{relation.kind} · {relation.on_delete}{relation.nullable ? " · valfri" : ""}</span>
                            </Link>
                            <Link href={entityHref(relation.target)} className="shrink-0 font-mono text-xs text-accent no-underline hover:underline">
                              → {entityById.get(relation.target)?.name ?? "#" + relation.target}
                            </Link>
                          </li>
                        ))}
                        {entityRelations.length === 0 && <li className="px-3 py-2 text-sm text-text-muted">Inga relationer än.</li>}
                      </ul>
                    </section>
                  </div>
                </details>
              </li>
            )
          })}
          {entities.length === 0 && (
            <li className="px-4 py-4 text-sm text-text-muted sm:px-5">
              Inga entiteter än. <Link href="/model/domain/entities/new" className="text-accent">Skapa den första</Link> – till exempel Kund, Order eller Produkt.
            </li>
          )}
        </ul>
      </ModelSection>

      <ModelSection
        id="domain-relations"
        label="Relationer"
        icon={<GitBranch size={17} className="text-accent" aria-hidden />}
        title={<>Alla relationer <span className="ml-1 text-sm font-normal text-text-muted">{relations.length}</span></>}
        actions={<RowLink href="/model/domain/relations/new">Ny relation</RowLink>}
      >
        <ul className="divide-y divide-border">
          {relations.map((relation) => (
            <li key={relation.id} className="flex items-center gap-3 px-4 py-2.5 font-mono text-sm sm:px-5">
              <Link href={entityHref(relation.source)} className="text-text no-underline hover:text-accent">{entityById.get(relation.source)?.name ?? "#" + relation.source}</Link>
              <Link href={"/model/domain/relations/" + relation.id + "/edit"} className="text-xs text-text-muted no-underline hover:text-accent">— {relation.name} ({relation.kind}) →</Link>
              <Link href={entityHref(relation.target)} className="text-text no-underline hover:text-accent">{entityById.get(relation.target)?.name ?? "#" + relation.target}</Link>
            </li>
          ))}
          {relations.length === 0 && <li className="px-4 py-4 text-sm text-text-muted sm:px-5">Inga relationer än. En relation kopplar två entiteter, till exempel att en Order hör till en Kund.</li>}
        </ul>
      </ModelSection>
    </div>
  )
}
