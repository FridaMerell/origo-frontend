"use client"

import Link from "next/link"
import { notFound } from "next/navigation"
import type { FluxScaffoldTarget } from "@/app/lib/dal"
import { useModelData } from "../model-data-provider"
import { ApiBreadcrumb, JsonContract, MethodBadge } from "./api-components"
import { ApiCodeGenerator } from "./api-code-generator"

type DetailProps = { id: number; target: FluxScaffoldTarget; file?: string }

function NoProject() {
  return <p className="text-sm text-text-muted">Välj ett projekt för att öppna API Workbench.</p>
}

export function ApiProjectionView({ id, target, file }: DetailProps) {
  const data = useModelData()
  if (!data) return <NoProject />
  const projection = data.design.api_projections.find((item) => item.id === id)
  if (!projection) notFound()
  const operationById = new Map(data.design.api_operations.map((operation) => [operation.id, operation]))
  const uses = data.design.api_operation_responses.filter((response) => response.projection === projection.id)

  return (
    <div className="flex flex-col gap-6">
      <ApiBreadcrumb><span className="font-mono text-text">{projection.name}</span></ApiBreadcrumb>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="min-w-0 rounded-xl border border-border bg-surface p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-text-faint">Återanvändbar API-projektion</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="mt-1 break-all font-mono text-2xl font-semibold text-text">{projection.name}</h2>
            <Link href={`/model/api/projections/${projection.id}/edit`} className="rounded-md border border-border px-3 py-1.5 text-sm text-text no-underline hover:bg-surface-2">Redigera projektion</Link>
          </div>
          {projection.description && <p className="mt-3 text-sm leading-6 text-text-muted">{projection.description}</p>}
          <JsonContract label="Svarsschema" value={projection.schema} />
        </article>
        <aside className="min-w-0 rounded-xl border border-border bg-surface p-4 sm:p-5">
          <h2 className="font-semibold text-text">Används av</h2>
          <ul className="mt-3 space-y-3">
            {uses.map((response) => {
              const operation = operationById.get(response.operation)
              return operation ? (
                <li key={response.id}>
                  <Link href={`/model/api/operations/${operation.id}`} className="block min-w-0 text-sm no-underline hover:text-accent">
                    <MethodBadge method={operation.method} />
                    <span className="ml-2 break-all font-mono text-text">{operation.path}</span>
                    <span className="ml-2 text-text-muted">{response.status_code}</span>
                  </Link>
                </li>
              ) : null
            })}
            {uses.length === 0 && <li className="text-sm text-text-muted">Ingen operation använder projektionen ännu.</li>}
          </ul>
        </aside>
      </section>
      <ApiCodeGenerator
        target={target}
        file={file}
        focusName={projection.name}
        focusFiles={{ typescript: ["api-projections.ts"] }}
      />
    </div>
  )
}

export function ApiResourceView({ id, target, file }: DetailProps) {
  const data = useModelData()
  if (!data) return <NoProject />
  const resource = data.design.resources.find((item) => item.id === id)
  if (!resource) notFound()
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
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[.12em] text-text-faint">API-resurs</p>
              <h2 className="mt-1 break-all font-mono text-2xl font-semibold text-text">{resource.path}</h2>
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
          <section className="min-w-0">
            <h3 className="font-semibold text-text">Operationer</h3>
            <ul className="mt-3 divide-y divide-border">
              {operations.map((operation) => (
                <li key={operation.id}>
                  <Link href={"/model/api/operations/" + operation.id} className="flex flex-wrap items-center justify-between gap-3 py-3 no-underline hover:text-accent">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <MethodBadge method={operation.method} />
                      <span className="break-all font-mono text-sm text-text">{operation.path}</span>
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

      <ApiCodeGenerator target={target} file={file} resource={resource} />

      <section className="border-y border-border py-5">
        <h2 className="font-semibold text-text">Resurskontrakt</h2>
        <JsonContract label="Resursmetadata" value={{ entity: resource.entity, path: resource.path, title: resource.title }} />
      </section>
    </div>
  )
}

export function ApiOperationView({ id, target, file }: DetailProps) {
  const data = useModelData()
  if (!data) return <NoProject />
  const operation = data.design.api_operations.find((item) => item.id === id)
  if (!operation) notFound()
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
        <span className="break-all font-mono text-text">{operation.path}</span>
      </ApiBreadcrumb>

      <section className="border-y border-border">
        <header className="border-b border-border py-4">
          <div className="flex flex-wrap items-center gap-3">
            <MethodBadge method={operation.method} />
            <h2 className="min-w-0 break-all font-mono text-xl font-semibold text-text">{operation.path}</h2>
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
          <section className="min-w-0">
            <h3 className="font-semibold text-text">Request-kontrakt</h3>
            <JsonContract label="Parametrar" value={operation.parameters} />
            <JsonContract label="Request-schema" value={operation.request_schema} />
            <JsonContract label="Paginering" value={operation.pagination} />
          </section>
          <section className="min-w-0 border-t border-border pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
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

      <ApiCodeGenerator target={target} file={file} resource={resource} operation={operation} />
    </div>
  )
}
