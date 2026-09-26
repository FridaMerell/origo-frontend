import Link from "next/link"
import { notFound } from "next/navigation"
import { getFluxScaffold, type FluxScaffoldTarget } from "@/app/lib/dal/flux"
import { ApiBreadcrumb, ApiCodeGenerator, JsonContract, MethodBadge } from "../../api-components"
import { loadApiWorkbenchData } from "../../api-data"

function targetFor(value?: string): FluxScaffoldTarget {
  return value === "django" || value === "csharp" ? value : "typescript"
}

export default async function ApiResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ resourceId: string }>
  searchParams: Promise<{ target?: string; file?: string }>
}) {
  const [{ resourceId }, query, data] = await Promise.all([params, searchParams, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att öppna API Workbench.</p>

  const resource = data.design.resources.find((item) => item.id === Number(resourceId))
  if (!resource) notFound()
  const target = targetFor(query.target)
  const scaffold = await getFluxScaffold(data.projectId, target)
  const entity = data.design.entities.find((item) => item.id === resource.entity)
  const operations = data.design.api_operations.filter((item) => item.resource === resource.id)
  const fields = data.design.fields.filter((item) => item.entity === resource.entity).sort((a, b) => a.order - b.order)

  return (
    <div className="flex flex-col gap-6">
      <ApiBreadcrumb>
        <Link href={"/model/api/resources/" + resource.id} className="font-mono text-text">{resource.path}</Link>
      </ApiBreadcrumb>

      <section className="border-y border-border">
        <header className="border-b border-border py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.12em] text-text-faint">API-resurs</p>
              <h2 className="mt-1 font-mono text-2xl font-semibold text-text">{resource.path}</h2>
            </div>
            <p className="text-sm text-text-muted">
              Entity: <Link href={"/model/domain?entity=" + resource.entity + "#entity-" + resource.entity} className="font-mono text-text hover:text-accent">{entity?.name ?? "#" + resource.entity}</Link>
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link href={"/model/api/resources/" + resource.id + "/edit"} className="font-medium text-accent no-underline hover:underline">Redigera resource</Link>
            <Link href={"/model/api/operations/new?resource=" + resource.id} className="font-medium text-accent no-underline hover:underline">Ny operation</Link>
          </div>
          {resource.description && <p className="mt-3 text-sm text-text-muted">{resource.description}</p>}
        </header>

        <div className="grid gap-6 py-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <section>
            <h3 className="font-semibold text-text">Operationer</h3>
            <ul className="mt-3 divide-y divide-border">
              {operations.map((operation) => (
                <li key={operation.id}>
                  <Link href={"/model/api/operations/" + operation.id} className="flex flex-wrap items-center justify-between gap-3 py-3 no-underline hover:text-accent">
                    <div className="flex flex-wrap items-center gap-2">
                      <MethodBadge method={operation.method} />
                      <span className="font-mono text-sm text-text">{operation.path}</span>
                      <span className="text-sm text-text-muted">{operation.title}</span>
                    </div>
                    <span className="text-xs text-text-faint">{operation.key}</span>
                  </Link>
                </li>
              ))}
              {operations.length === 0 && <li className="py-3 text-sm text-text-muted">Inga operationer har specificerats.</li>}
            </ul>
          </section>

          <aside className="border-t border-border pt-5 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
            <h3 className="font-semibold text-text">Domänfält</h3>
            <ul className="mt-3 divide-y divide-border">
              {fields.map((field) => (
                <li key={field.id}>
                  <Link href={"/model/domain/fields/" + field.id + "/edit"} className="flex justify-between gap-3 py-2 font-mono text-xs text-text-muted hover:text-accent">
                    <span>{field.name}</span>
                    <span>{field.type}{field.nullable ? " | null" : ""}</span>
                  </Link>
                </li>
              ))}
              {fields.length === 0 && <li className="py-2 text-sm text-text-muted">Inga fält.</li>}
            </ul>
          </aside>
        </div>
      </section>

      <ApiCodeGenerator
        projectId={data.projectId}
        basePath={"/model/api/resources/" + resource.id}
        target={target}
        file={query.file}
        scaffold={scaffold}
        resource={resource}
      />

      <section className="border-y border-border py-5">
        <h2 className="font-semibold text-text">Resurskontrakt</h2>
        <JsonContract label="Resursmetadata" value={{ entity: resource.entity, path: resource.path, title: resource.title }} />
      </section>
    </div>
  )
}
