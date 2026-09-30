import Link from "next/link"
import { ChevronRight, KeyRound, PanelTop, Plus, RadioTower } from "lucide-react"
import { loadApiWorkbenchData } from "../api/api-data"
import { ActionLink, ModelPageHeader, ModelSection, RowLink } from "../model-ui"

const scopeLabels = {
  all: "Alla poster",
  own: "Egna poster",
  member: "Projektmedlemskap",
} as const

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <li className="px-4 py-4 text-sm text-text-muted sm:px-5">{children}</li>
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
  const resourceById = new Map(resources.map((resource) => [resource.id, resource]))
  const operationById = new Map(operations.map((operation) => [operation.id, operation]))

  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModelPageHeader
        title="Frontend och åtkomst"
        description="Skärmarna i appen, dataflödet till API:t och vem som får göra vad."
        actions={
          <>
            <ActionLink href="/model/frontend/screens/new" variant="primary"><Plus size={15} aria-hidden /> Ny skärm</ActionLink>
            <ActionLink href="/model/frontend/providers/new">Ny provider</ActionLink>
            <ActionLink href="/model/frontend/roles/new">Ny roll</ActionLink>
          </>
        }
      />

      <ModelSection
        id="frontend-screens"
        label="Skärmar"
        icon={<PanelTop size={17} className="text-accent" aria-hidden />}
        title={<>Skärmar <span className="ml-1 text-sm font-normal text-text-muted">{screens.length}</span></>}
        actions={<RowLink href="/model/frontend/screens/new">Ny skärm</RowLink>}
      >
        <ul className="divide-y divide-border">
          {screens.map((screen) => (
            <li key={screen.id} id={"screen-" + screen.id} className="flex items-start gap-4 px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <Link href={"/model/frontend/screens/" + screen.id + "/edit"} className="text-sm font-medium text-text no-underline hover:text-accent">{screen.name}</Link>
                  <span className="font-mono text-xs text-accent">{screen.route}</span>
                </div>
                {screen.description && <p className="mt-1 text-sm text-text-muted">{screen.description}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {screen.entities.map((entityId) => (
                    <Link key={entityId} href={"/model/domain?entity=" + entityId + "#entity-" + entityId} className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-xs text-text-muted no-underline hover:text-accent">
                      {entityById.get(entityId)?.name ?? "#" + entityId}
                    </Link>
                  ))}
                  {screen.entities.length === 0 && <span className="text-xs text-text-faint">Visar ingen domändata</span>}
                </div>
              </div>
              <RowLink href={"/model/frontend/screens/" + screen.id + "/edit"}>Redigera</RowLink>
            </li>
          ))}
          {screens.length === 0 && <EmptyRow>Inga skärmar än. En skärm är en route i appen, till exempel <span className="font-mono">/kunder</span>, och den data den visar.</EmptyRow>}
        </ul>
      </ModelSection>

      <ModelSection
        id="frontend-providers"
        label="Providers"
        icon={<RadioTower size={17} className="text-accent" aria-hidden />}
        title={<>Providers <span className="ml-1 text-sm font-normal text-text-muted">{providers.length}</span></>}
        actions={<RowLink href="/model/frontend/providers/new">Ny provider</RowLink>}
      >
        <ul className="divide-y divide-border">
          {providers.map((provider) => (
            <li key={provider.id} id={"provider-" + provider.id}>
              <Link href={"/model/frontend/providers/" + provider.id} className="group flex items-center gap-4 px-4 py-3 no-underline hover:bg-surface-2 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text group-hover:text-accent">{provider.name}</p>
                  <p className="mt-0.5 truncate font-mono text-xs text-text-muted">
                    {provider.resources.map((id) => resourceById.get(id)?.path ?? "#" + id).join(" · ") || "Inga resurser valda"}
                  </p>
                </div>
                <ChevronRight size={16} aria-hidden className="shrink-0 text-text-faint group-hover:text-accent" />
              </Link>
            </li>
          ))}
          {providers.length === 0 && <EmptyRow>Inga providers än. En provider hämtar data från valda API-resurser åt skärmarna.</EmptyRow>}
        </ul>
      </ModelSection>

      <ModelSection
        id="frontend-roles"
        label="Roller"
        icon={<KeyRound size={17} className="text-accent" aria-hidden />}
        title={<>Roller och åtkomst <span className="ml-1 text-sm font-normal text-text-muted">{roles.length}</span></>}
        actions={<RowLink href="/model/frontend/roles/new">Ny roll</RowLink>}
      >
        <ul className="divide-y divide-border">
          {roles.map((role) => {
            const rolePermissions = permissions.filter((permission) => permission.role === role.id)
            return (
              <li key={role.id} className="px-4 py-3 sm:px-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link href={"/model/frontend/roles/" + role.id + "/edit"} className="text-sm font-medium text-text no-underline hover:text-accent">{role.name}</Link>
                    {role.description && <p className="mt-0.5 text-sm text-text-muted">{role.description}</p>}
                  </div>
                  <RowLink href={"/model/frontend/roles/" + role.id + "/edit"}>Hantera åtkomst</RowLink>
                </div>
                <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-bg/40">
                  {rolePermissions.map((permission) => {
                    const operation = operationById.get(permission.api_operation)
                    if (!operation) return <li key={permission.id} className="px-3 py-2 font-mono text-xs text-text-faint">#{permission.api_operation}</li>
                    const resource = resourceById.get(operation.resource)
                    return (
                      <li key={permission.id} className="flex items-center justify-between gap-4 px-3 py-2">
                        <span className="min-w-0 truncate font-mono text-xs text-text">
                          <span className="font-semibold">{operation.method}</span> {operation.path}
                          <span className="ml-2 text-text-faint">{resource?.path ?? ""}</span>
                        </span>
                        <span className="shrink-0 text-xs text-text-muted">{scopeLabels[permission.scope]}</span>
                      </li>
                    )
                  })}
                  {rolePermissions.length === 0 && <li className="px-3 py-2 text-sm text-text-muted">Rollen har ingen åtkomst än.</li>}
                </ul>
              </li>
            )
          })}
          {roles.length === 0 && <EmptyRow>Inga roller än. En roll styr vilka API-operationer en användare får anropa, till exempel Admin eller Läsare.</EmptyRow>}
        </ul>
      </ModelSection>
    </div>
  )
}
