import Link from "next/link"
import { ArrowRight, Database, GitBranch, ListTree } from "lucide-react"
import { loadApiWorkbenchData } from "../api/api-data"

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

  return (
    <div className="flex flex-col gap-7 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-5">
        <div>
          <Link href="/model" className="text-sm text-text-muted hover:text-accent">Teknisk dokumentation</Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[.14em] text-text-faint">Datamodell</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-text">Entiteter och relationer</h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">Varje namn leder till dess ändringsformulär. En relation och API-resurs länkar alltid vidare till sitt beroende.</p>
        </div>
        <div className="flex w-full flex-col gap-2 text-sm sm:w-auto sm:flex-row sm:flex-wrap">
          <Link href="/model/domain/entities/new" className="inline-flex min-h-10 items-center justify-center border border-accent/40 px-3 font-medium text-accent no-underline hover:bg-accent/10">Ny entitet</Link>
          <Link href="/model/domain/fields/new" className="inline-flex min-h-10 items-center justify-center border border-accent/40 px-3 font-medium text-accent no-underline hover:bg-accent/10">Nytt fält</Link>
          <Link href="/model/domain/relations/new" className="inline-flex min-h-10 items-center justify-center border border-accent/40 px-3 font-medium text-accent no-underline hover:bg-accent/10">Ny relation</Link>
        </div>
      </header>

      <section className="grid gap-x-8 divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <p className="flex items-center justify-between py-3 text-sm text-text-muted sm:pr-6">Entiteter <span className="font-mono text-accent">{entities.length}</span></p>
        <p className="flex items-center justify-between py-3 text-sm text-text-muted sm:px-6">Fält <span className="font-mono text-accent">{fields.length}</span></p>
        <p className="flex items-center justify-between py-3 text-sm text-text-muted sm:pl-6">Relationer <span className="font-mono text-accent">{relations.length}</span></p>
      </section>

      <section className="divide-y divide-border border-y border-border">
        {entities.map((entity) => {
          const entityFields = fields.filter((field) => field.entity === entity.id).sort((a, b) => a.order - b.order)
          const entityRelations = relations.filter((relation) => relation.source === entity.id)
          const resource = resources.find((item) => item.entity === entity.id)

          return (
            <details key={entity.id} id={"entity-" + entity.id} open={selectedEntityId === entity.id} className="group scroll-mt-6">
              <summary className="grid cursor-pointer list-none gap-2 px-1 py-4 hover:bg-surface-2 sm:grid-cols-[minmax(12rem,.65fr)_minmax(0,1.4fr)_minmax(14rem,.65fr)_auto] sm:items-center sm:px-3">
                <div className="flex items-center gap-2">
                  <Database size={17} className="text-accent" />
                  <h2 className="font-mono text-sm font-semibold text-text">{entity.name}</h2>
                </div>
                <p className="text-sm text-text-muted">{entity.description || "Ingen beskrivning."}</p>
                <p className="font-mono text-xs text-text-muted">{entityFields.length} fält · {entityRelations.length} relationer · {resource ? resource.path : "ingen Resource"}</p>
                <span className="text-xs font-medium text-accent group-open:hidden">Öppna Entity</span>
                <span className="hidden text-xs font-medium text-accent group-open:inline">Stäng Entity</span>
              </summary>

              <div className="border-t border-border py-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <p className="text-sm text-text-muted">Redigera objekt direkt eller följ beroenden till deras egna dokument.</p>
                  <div className="grid gap-2 text-sm sm:flex">
                    <Link href={"/model/domain/entities/" + entity.id + "/edit"} className="inline-flex min-h-10 items-center justify-center border border-border px-3 text-text no-underline hover:bg-surface-2">Redigera Entity</Link>
                    <Link href="/model/domain/fields/new" className="inline-flex min-h-10 items-center justify-center border border-border px-3 text-text no-underline hover:bg-surface-2">Nytt fält</Link>
                    <Link href="/model/domain/relations/new" className="inline-flex min-h-10 items-center justify-center border border-border px-3 text-text no-underline hover:bg-surface-2">Ny relation</Link>
                  </div>
                </div>

                <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_14rem]">
                  <section>
                    <div className="flex items-center gap-2">
                      <ListTree size={16} className="text-accent" />
                      <h3 className="text-sm font-semibold text-text">Fält</h3>
                    </div>
                    <ul className="mt-3 divide-y divide-border">
                      {entityFields.map((field) => (
                        <li key={field.id}>
                          <Link href={"/model/domain/fields/" + field.id + "/edit"} className="flex flex-wrap items-center justify-between gap-2 py-2 no-underline hover:text-accent">
                            <span className="font-mono text-xs text-text">{field.name}</span>
                            <span className="font-mono text-xs text-text-muted">{field.type}{field.nullable ? " | null" : ""}{field.unique ? " · unique" : ""}{field.default ? " · " + field.default : ""}</span>
                          </Link>
                        </li>
                      ))}
                      {entityFields.length === 0 && <li className="py-2 text-sm text-text-muted">Inga fält.</li>}
                    </ul>
                  </section>

                  <section>
                    <div className="flex items-center gap-2">
                      <GitBranch size={16} className="text-accent" />
                      <h3 className="text-sm font-semibold text-text">Utgående relationer</h3>
                    </div>
                    <ul className="mt-3 divide-y divide-border">
                      {entityRelations.map((relation) => {
                        const target = entityById.get(relation.target)
                        const targetFields = fields.filter((field) => field.entity === relation.target)
                        const targetRelations = relations.filter((item) => item.source === relation.target)
                        const targetResource = resources.find((item) => item.entity === relation.target)
                        return (
                        <li key={relation.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                          <div>
                            <Link href={"/model/domain/relations/" + relation.id + "/edit"} className="font-mono text-xs text-text no-underline hover:text-accent">{relation.name}</Link>
                            <p className="mt-1 text-xs text-text-faint">{relation.kind} · {relation.on_delete}{relation.nullable ? " · nullable" : ""}</p>
                          </div>
                          <div className="group/target relative">
                            <Link href={"/model/domain?entity=" + relation.target + "#entity-" + relation.target} className="font-mono text-xs text-accent no-underline hover:underline">→ {target?.name ?? "#" + relation.target}</Link>
                            <aside className="invisible absolute right-0 top-full z-20 mt-2 hidden w-96 translate-y-1 border border-border bg-surface p-4 opacity-0 shadow-lg transition duration-150 group-hover/target:visible group-hover/target:translate-y-0 group-hover/target:opacity-100 lg:block">
                              <p className="font-mono text-sm font-semibold text-text">{target?.name ?? "#" + relation.target}</p>
                              <p className="mt-1 text-sm leading-5 text-text-muted">{target?.description || "Ingen beskrivning."}</p>
                              <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
                                <div><dt className="text-text-faint">Relationer</dt><dd className="mt-1 font-mono text-text">{targetRelations.length}</dd></div>
                                <div><dt className="text-text-faint">Resource</dt><dd className="mt-1 break-all font-mono text-text">{targetResource?.path ?? "—"}</dd></div>
                              </dl>
                              <section className="mt-3 border-t border-border pt-3">
                                <div className="flex items-baseline justify-between gap-3">
                                  <h4 className="text-xs font-semibold uppercase tracking-[.1em] text-text-faint">Fält</h4>
                                  <span className="font-mono text-xs text-text-muted">{targetFields.length} st</span>
                                </div>
                                <ul className="mt-2 max-h-52 divide-y divide-border overflow-y-auto">
                                  {targetFields.slice(0, 8).map((field) => (
                                    <li key={field.id} className="flex items-baseline justify-between gap-4 py-1.5 font-mono text-xs">
                                      <span className="text-text">{field.name}</span>
                                      <span className="text-text-muted">{field.type}{field.nullable ? " | null" : ""}</span>
                                    </li>
                                  ))}
                                  {targetFields.length === 0 && <li className="py-1.5 text-xs text-text-muted">Inga fält är definierade.</li>}
                                </ul>
                                {targetFields.length > 8 && <p className="mt-2 text-xs text-text-faint">Visar 8 av {targetFields.length} fält.</p>}
                              </section>
                              <p className="mt-3 text-xs text-accent">Klicka för att öppna Entityn.</p>
                            </aside>
                          </div>
                        </li>
                        )
                      })}
                      {entityRelations.length === 0 && <li className="py-2 text-sm text-text-muted">Inga utgående relationer.</li>}
                    </ul>
                  </section>

                  <aside className="border-t border-border pt-5 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
                    <h3 className="text-sm font-semibold text-text">API-resurs</h3>
                    {resource ? (
                      <>
                        <p className="mt-2 font-mono text-xs text-text">{resource.path}</p>
                        <Link href={"/model/api/resources/" + resource.id} className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent no-underline hover:underline">
                          Öppna kontrakt <ArrowRight size={14} />
                        </Link>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-text-muted">Ingen Resource.</p>
                    )}
                  </aside>
                </div>
              </div>
            </details>
          )
        })}
        {entities.length === 0 && (
          <p className="py-5 text-sm text-text-muted">
            Inga entiteter finns i den valda designen. <Link href="/model/domain/entities/new" className="text-accent">Skapa den första.</Link>
          </p>
        )}
      </section>
    </div>
  )
}
