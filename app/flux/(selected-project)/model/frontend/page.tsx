import Link from "next/link"
import { ArrowRight, KeyRound, PanelTop, RadioTower } from "lucide-react"
import type { FluxScreen } from "@/app/lib/dal"
import { loadApiWorkbenchData } from "../api/api-data"

const scopeLabels = {
  all: "Alla poster",
  own: "Egna poster",
  member: "Projektmedlemskap",
} as const

function ScreenMap({
  screens,
  entityNames,
}: {
  screens: FluxScreen[]
  entityNames: Map<number, string>
}) {
  return (
    <section id="frontend-overview" className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border bg-surface-2 px-4 py-4 sm:px-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-text-faint">Screenkarta</p>
          <p className="mt-1 text-sm text-text-muted">Varje screen, vad den visar och vilken domändata den använder.</p>
        </div>
        <span className="font-mono text-xs text-text-muted">{screens.length} screens</span>
      </header>
      <ol className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
        {screens.map((screen) => (
          <li key={screen.id} className="rounded-lg border border-border bg-bg p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-text-faint">Screen</p>
                <Link href={"/model/frontend/screens/" + screen.id + "/edit"} className="mt-1 block truncate text-base font-semibold text-text no-underline hover:text-accent">{screen.name}</Link>
                <p className="mt-1 truncate font-mono text-xs text-accent">{screen.route}</p>
              </div>
              <span className="rounded-full border border-border px-2 py-0.5 font-mono text-xs text-text-muted">{screen.entities.length} entiteter</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-text-muted">{screen.description || "Ingen innehållsbeskrivning är angiven."}</p>
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-text-faint">Visar data från</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {screen.entities.map((entityId) => (
                  <Link key={entityId} href={"/model/domain?entity=" + entityId + "#entity-" + entityId} className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-xs text-text-muted no-underline hover:text-accent">
                    {entityNames.get(entityId) ?? "#" + entityId}
                  </Link>
                ))}
                {screen.entities.length === 0 && <span className="text-xs text-text-faint">Ingen entitet är kopplad.</span>}
              </div>
            </div>
          </li>
        ))}
        {screens.length === 0 && <li className="rounded-lg border border-dashed border-border p-4 text-sm text-text-muted">Skapa första screenen för att se frontendöversikten.</li>}
      </ol>
    </section>
  )
}

export default async function FrontendDesignPage() {
  const data = await loadApiWorkbenchData()
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att öppna frontenddesignen.</p>

  const { design } = data
  const entities = design.entities ?? []
  const resources = design.resources ?? []
  const operations = design.api_operations ?? []
  const providers = design.providers ?? []
  const screens = design.screens ?? []
  const roles = design.roles ?? []
  const permissions = design.role_permissions ?? []
  const entityById = new Map(entities.map((entity) => [entity.id, entity]))
  const entityNames = new Map(entities.map((entity) => [entity.id, entity.name]))
  const resourceById = new Map(resources.map((resource) => [resource.id, resource]))
  const operationById = new Map(operations.map((operation) => [operation.id, operation]))

  return (
    <div className="flex flex-col gap-7 pb-12">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-5 sm:items-end">
        <div>
          <Link href="/model" className="text-sm text-text-muted hover:text-accent">Teknisk dokumentation</Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[.14em] text-text-faint">Frontend</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-text">Frontendöversikt</h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">Skärmar, providers och åtkomst med deras faktiska kopplingar till domän och API.</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 text-sm sm:flex sm:w-auto sm:flex-wrap sm:gap-x-4 sm:gap-y-2">
          <Link href="/model/frontend/screens/new" className="inline-flex min-h-10 items-center font-medium text-accent no-underline hover:underline">Ny screen</Link>
          <Link href="/model/frontend/providers/new" className="inline-flex min-h-10 items-center font-medium text-accent no-underline hover:underline">Ny Provider-generator</Link>
          <Link href="/model/frontend/roles/new" className="inline-flex min-h-10 items-center font-medium text-accent no-underline hover:underline">Ny roll</Link>
        </div>
      </header>

      <ScreenMap screens={screens} entityNames={entityNames} />

      <section className="border-y border-border">
        <header className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-2">
            <PanelTop size={18} className="text-accent" />
            <h2 className="font-semibold text-text">Screens</h2>
          </div>
          <span className="font-mono text-xs text-text-muted">{screens.length} st</span>
        </header>
        <ul className="divide-y divide-border">
          {screens.map((screen) => (
            <li key={screen.id} id={"screen-" + screen.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(12rem,.65fr)_minmax(0,1.4fr)_minmax(12rem,.7fr)_auto] sm:items-center">
              <div>
                <Link href={"/model/frontend/screens/" + screen.id + "/edit"} className="font-medium text-text no-underline hover:text-accent">{screen.name}</Link>
                <p className="mt-1 font-mono text-xs text-accent">{screen.route}</p>
              </div>
              <p className="text-sm text-text-muted">{screen.description || "Ingen beskrivning."}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {screen.entities.map((entityId) => <Link key={entityId} href={"/model/domain?entity=" + entityId + "#entity-" + entityId} className="font-mono text-xs text-text-muted no-underline hover:text-accent">{entityById.get(entityId)?.name ?? "#" + entityId}</Link>)}
                {screen.entities.length === 0 && <span className="text-xs text-text-faint">Ingen entitet</span>}
              </div>
              <Link href={"/model/frontend/screens/" + screen.id + "/edit"} className="text-sm text-accent no-underline hover:underline">Redigera</Link>
            </li>
          ))}
          {screens.length === 0 && <li className="py-4 text-sm text-text-muted">Inga Screens är specificerade. <Link href="/model/frontend/screens/new" className="text-accent">Skapa den första.</Link></li>}
        </ul>
      </section>

      <section className="border-y border-border">
        <header className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-2">
            <RadioTower size={18} className="text-accent" />
            <h2 className="font-semibold text-text">Providers</h2>
          </div>
          <span className="font-mono text-xs text-text-muted">{providers.length} st</span>
        </header>
        <ul className="divide-y divide-border">
          {providers.map((provider) => (
            <li key={provider.id} id={"provider-" + provider.id}>
              <Link href={"/model/frontend/providers/" + provider.id} className="group grid gap-2 py-4 no-underline hover:bg-surface-2 sm:grid-cols-[minmax(12rem,.65fr)_minmax(0,1.4fr)_minmax(12rem,.7fr)_1.5rem] sm:items-center">
                <div>
                  <p className="font-medium text-text">{provider.name}</p>
                  <p className="mt-1 font-mono text-xs text-accent">Provider-generator</p>
                </div>
                <p className="text-sm text-text-muted">{provider.description || "Ingen beskrivning."}</p>
                <span className="flex flex-wrap gap-x-3 gap-y-1">
                  {provider.resources.map((resourceId) => {
                    const resource = resourceById.get(resourceId)
                    return resource
                      ? <span key={resourceId} className="font-mono text-xs text-text-muted">{resource.path}</span>
                      : <span key={resourceId} className="font-mono text-xs text-text-faint">#{resourceId}</span>
                  })}
                </span>
                <ArrowRight size={16} className="hidden text-text-faint group-hover:text-accent sm:block" />
              </Link>
            </li>
          ))}
          {providers.length === 0 && <li className="py-4 text-sm text-text-muted">Inga Providers är specificerade. <Link href="/model/frontend/providers/new" className="text-accent">Skapa den första i generatorn.</Link></li>}
        </ul>
      </section>

      <section className="border-y border-border">
        <header className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-accent" />
            <h2 className="font-semibold text-text">Roller och API-åtkomst</h2>
          </div>
          <span className="font-mono text-xs text-text-muted">{roles.length} roller</span>
        </header>
        <ul className="divide-y divide-border">
          {roles.map((role) => {
            const rolePermissions = permissions.filter((permission) => permission.role === role.id)
            return (
              <li key={role.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={"/model/frontend/roles/" + role.id + "/edit"} className="font-medium text-text no-underline hover:text-accent">{role.name}</Link>
                  {role.description && <p className="mt-1 text-sm text-text-muted">{role.description}</p>}
                  </div>
                  <Link href={"/model/frontend/roles/" + role.id + "/edit"} className="inline-flex min-h-10 items-center text-sm font-medium text-accent no-underline hover:underline">Hantera åtkomst</Link>
                </div>
                <ul className="mt-3 divide-y divide-border border-l border-border">
                  {rolePermissions.map((permission) => {
                    const operation = operationById.get(permission.api_operation)
                    const resource = operation ? resourceById.get(operation.resource) : undefined
                    return operation
                      ? <li key={permission.id} className="grid gap-2 py-2 pl-4 text-sm sm:grid-cols-[minmax(9rem,.7fr)_minmax(0,1fr)_10rem] sm:items-center"><span className="font-mono text-xs text-text-muted">{resource?.path ?? "#" + operation.resource}</span><span className="font-mono text-xs text-text">{operation.key} · {operation.method} {operation.path}</span><span className="text-xs text-text-muted">{scopeLabels[permission.scope]}</span></li>
                      : <li key={permission.id} className="py-2 pl-4 font-mono text-xs text-text-faint">#{permission.api_operation}</li>
                  })}
                  {rolePermissions.length === 0 && <li className="py-2 pl-4 text-sm text-text-muted">Inga API-operationer är valda.</li>}
                </ul>
              </li>
            )
          })}
          {roles.length === 0 && <li className="py-4 text-sm text-text-muted">Inga roller är specificerade. <Link href="/model/frontend/roles/new" className="text-accent">Skapa den första.</Link></li>}
        </ul>
      </section>
    </div>
  )
}
