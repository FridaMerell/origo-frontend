import Link from "next/link"
import { notFound } from "next/navigation"
import { getFluxScaffold, type FluxScaffoldTarget } from "@/app/lib/dal/flux"
import { ApiBreadcrumb, ApiCodeGenerator, JsonContract, MethodBadge } from "../../api-components"
import { loadApiWorkbenchData } from "../../api-data"

function targetFor(value?: string): FluxScaffoldTarget {
  return value === "django" || value === "csharp" ? value : "typescript"
}

export default async function ApiOperationPage({
  params,
  searchParams,
}: {
  params: Promise<{ operationId: string }>
  searchParams: Promise<{ target?: string; file?: string }>
}) {
  const [{ operationId }, query, data] = await Promise.all([params, searchParams, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att öppna API Workbench.</p>

  const operation = data.design.api_operations.find((item) => item.id === Number(operationId))
  if (!operation) notFound()
  const target = targetFor(query.target)
  const scaffold = await getFluxScaffold(data.projectId, target)
  const resource = data.design.resources.find((item) => item.id === operation.resource)
  const entity = data.design.entities.find((item) => item.id === resource?.entity)
  const responses = data.design.api_operation_responses.filter((item) => item.operation === operation.id)
  const providers = data.design.providers.filter((item) => resource && item.resources.includes(resource.id))
  const permissions = data.design.role_permissions.filter((item) => item.api_operation === operation.id)
  const roles = data.design.roles.filter((role) => permissions.some((permission) => permission.role === role.id))
  const screens = data.design.screens.filter((screen) => resource && screen.entities.includes(resource.entity))
  const projectionById = new Map(data.design.api_projections.map((projection) => [projection.id, projection]))

  return (
    <div className="flex flex-col gap-6">
      <ApiBreadcrumb>
        <Link href={"/model/api/resources/" + (resource?.id ?? "")} className="font-mono text-text">{resource?.path ?? "Okänd resurs"}</Link>
        <span className="text-text-faint">/</span>
        <span className="font-mono text-text">{operation.path}</span>
      </ApiBreadcrumb>

      <section className="border-y border-border">
        <header className="border-b border-border py-4">
          <div className="flex flex-wrap items-center gap-3">
            <MethodBadge method={operation.method} />
            <h2 className="font-mono text-xl font-semibold text-text">{operation.path}</h2>
            <span className="border border-border px-2 py-0.5 text-xs text-text-muted">{operation.key}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link href={"/model/api/operations/" + operation.id + "/edit"} className="font-medium text-accent no-underline hover:underline">Redigera operation</Link>
            <Link href={"/model/api/responses/new?operation=" + operation.id} className="font-medium text-accent no-underline hover:underline">Nytt svar</Link>
          </div>
          <h3 className="mt-3 text-lg font-semibold text-text">{operation.title}</h3>
          {operation.description && <p className="mt-1 text-sm leading-6 text-text-muted">{operation.description}</p>}
        </header>

        <div className="grid gap-6 py-5 xl:grid-cols-2">
          <section>
            <h3 className="font-semibold text-text">Request-kontrakt</h3>
            <JsonContract label="Parametrar" value={operation.parameters} />
            <JsonContract label="Request-schema" value={operation.request_schema} />
            <JsonContract label="Paginering" value={operation.pagination} />
          </section>
          <section className="border-t border-border pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
            <h3 className="font-semibold text-text">Svarskontrakt</h3>
            <ul className="mt-3 divide-y divide-border">
              {responses.map((response) => {
                const projection = response.projection ? projectionById.get(response.projection) : null
                return (
                  <li key={response.id} className="py-3">
                    <p><span className="font-mono font-semibold text-text">{response.status_code}</span><span className="ml-2 text-sm text-text-muted">{response.description || "utan beskrivning"}</span></p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                      {projection ? <Link href={"/model/api/projections/" + projection.id} className="font-mono text-xs text-accent">Projektion: {projection.name}</Link> : <p className="text-xs text-text-faint">Bodyless response</p>}
                      <Link href={"/model/api/responses/" + response.id + "/edit"} className="text-xs text-text-muted hover:text-accent">Redigera svar</Link>
                    </div>
                  </li>
                )
              })}
              {responses.length === 0 && <li className="py-3 text-sm text-text-muted">Inga svarskoder har dokumenterats.</li>}
            </ul>
          </section>
        </div>
      </section>

      <section className="grid gap-6 divide-y divide-border border-y border-border py-5 xl:grid-cols-3 xl:divide-x xl:divide-y-0">
        <div className="xl:pr-6">
          <h2 className="font-semibold text-text">Behörighet</h2>
          <ul className="mt-3 space-y-2 text-sm text-text-muted">
            {roles.map((role) => {
              const permission = permissions.find((item) => item.role === role.id)
              return <li key={role.id}><Link href={"/model/frontend/roles/" + role.id + "/edit"} className="font-medium text-text hover:text-accent">{role.name}</Link> · {permission?.scope}</li>
            })}
            {roles.length === 0 && <li>Ingen RolePermission har kopplats.</li>}
          </ul>
        </div>
        <div className="border-t border-border pt-5 xl:border-t-0 xl:px-6 xl:pt-0">
          <h2 className="font-semibold text-text">Providers</h2>
          <ul className="mt-3 space-y-2 text-sm text-text-muted">
            {providers.map((provider) => <li key={provider.id}><Link href={"/model/frontend/providers/" + provider.id} className="font-medium text-text hover:text-accent">{provider.name}</Link></li>)}
            {providers.length === 0 && <li>Ingen Provider använder resursen.</li>}
          </ul>
        </div>
        <div className="border-t border-border pt-5 xl:border-t-0 xl:pl-6 xl:pt-0">
          <h2 className="font-semibold text-text">Berörda skärmar</h2>
          <ul className="mt-3 space-y-2 text-sm text-text-muted">
            {screens.map((screen) => <li key={screen.id}><Link href={"/model/frontend/screens/" + screen.id + "/edit"} className="font-mono text-text hover:text-accent">{screen.route}</Link> · {screen.name}</li>)}
            {screens.length === 0 && <li>Inga Screens är kopplade till {entity?.name ?? "entiteten"}.</li>}
          </ul>
        </div>
      </section>

      <ApiCodeGenerator
        projectId={data.projectId}
        basePath={"/model/api/operations/" + operation.id}
        target={target}
        file={query.file}
        scaffold={scaffold}
        resource={resource}
        operation={operation}
      />
    </div>
  )
}
