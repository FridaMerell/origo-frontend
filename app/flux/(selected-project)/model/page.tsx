import Link from "next/link"
import { cookies } from "next/headers"
import type { ReactNode } from "react"
import { ArrowRight, Braces, Cable, Database, PackageCheck, PanelTop, type LucideIcon } from "lucide-react"
import { FLUX_PROJECT_COOKIE } from "@/app/lib/config"
import { getFluxDesign, getFluxProjects } from "@/app/lib/dal"
import { ModelLaunchControls } from "./model-launch-controls"
import { ModelSidebar } from "./model-sidebar"

const modelIndex = [
  { id: "model-overview", label: "Översikt" },
  { id: "model-domain", label: "Domän" },
  { id: "model-api", label: "API" },
  { id: "model-frontend", label: "Frontend och åtkomst" },
  { id: "model-integrations", label: "Integrationer" },
  { id: "model-delivery", label: "Leverans" },
]

function CreateLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-accent/40 px-3 text-sm font-medium text-accent no-underline hover:bg-accent/10 sm:w-auto">
      Skapa {children}
    </Link>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  href,
  action,
}: {
  icon: LucideIcon
  title: string
  href: string
  action: string
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 bg-surface-2 px-4 py-4 sm:px-5">
      <div className="flex items-center gap-3">
        <Icon size={18} className="shrink-0 text-accent" />
        <h2 className="text-lg font-semibold text-text">{title}</h2>
      </div>
      <Link href={href} className="inline-flex min-h-10 items-center text-sm font-medium text-accent no-underline hover:underline">
        {action} <ArrowRight size={15} className="ml-1.5" />
      </Link>
    </header>
  )
}

function ObjectRow({
  name,
  contractName,
  countLabel,
  count,
  description,
  children,
}: {
  name: string
  contractName: string
  countLabel: string
  count: number
  description: string
  children: ReactNode
}) {
  return (
    <li className="grid gap-3 px-4 py-3 hover:bg-surface-2 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-center sm:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 sm:block">
        <p className="font-medium text-text">{name} <span className="font-mono text-xs font-normal text-text-faint">({contractName})</span></p>
        <p className="mt-1 font-mono text-xs text-text-muted">{countLabel}: <span className="text-accent">{count}</span></p>
      </div>
      <p className="text-sm leading-6 text-text-muted">{description}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">{children}</div>
    </li>
  )
}

export default async function FluxModelPage() {
  const selectedProjectId = (await cookies()).get(FLUX_PROJECT_COOKIE)?.value
  const projects = await getFluxProjects()
  const projectId = selectedProjectId && /^\d+$/.test(selectedProjectId)
    ? selectedProjectId
    : String(projects[0]?.id ?? "")
  const design = projectId ? await getFluxDesign(projectId) : null

  if (!design) return <p className="text-sm text-text-muted">Välj ett projekt för att öppna dess tekniska specifikation.</p>

  const entities = design.entities ?? []
  const fields = design.fields ?? []
  const relations = design.relations ?? []
  const resources = design.resources ?? []
  const operations = design.api_operations ?? []
  const responses = design.api_operation_responses ?? []
  const projections = design.api_projections ?? []
  const providers = design.providers ?? []
  const screens = design.screens ?? []
  const roles = design.roles ?? []
  const integrations = design.integrations ?? []
  const integrationOperations = design.integration_operations ?? []
  const seedRows = design.seed_rows ?? []
  const selectedProject = projects.find((project) => String(project.id) === projectId)
  const projectName = selectedProject?.name ?? "Valt projekt"
  const standardCrudKeys = ["list", "retrieve", "create", "update", "delete"] as const
  const completeCrudCount = resources.filter((resource) => {
    const keys = new Set(operations.filter((operation) => operation.resource === resource.id).map((operation) => operation.key))
    return standardCrudKeys.every((key) => keys.has(key))
  }).length
  const stackTargetCount = design.stack_profile?.targets.length ?? 0
  const scaffoldTarget = design.stack_profile?.targets[0] ?? "typescript"

  const sidebarProps = {
    projectId,
    sections: modelIndex,
    entityCount: entities.length,
    completeCrudCount,
    providerCount: providers.length,
    screenCount: screens.length,
    stackTargetCount,
    scaffoldTarget,
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <header id="model-overview" className="scroll-mt-24 border-b border-border pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-text">{projectName}</h1>
            <p className="mt-2 text-sm leading-6 text-text-muted">Projektets tekniska index: datamodell, API, klientgränser, integrationer och leveransunderlag.</p>
          </div>
          <div className="hidden md:block">
            <ModelLaunchControls projectId={projectId} entityCount={entities.length} scaffoldTarget={scaffoldTarget} />
          </div>
        </div>
      </header>

      <div className="md:hidden">
        <ModelSidebar {...sidebarProps} compact />
      </div>

      <div className="md:grid md:grid-cols-[16rem_minmax(0,1fr)] md:gap-8">
        <aside className="hidden md:sticky md:top-24 md:self-start md:block">
          <ModelSidebar {...sidebarProps} />
        </aside>

        <main className="flex min-w-0 flex-col gap-6">
          <section id="model-domain" className="scroll-mt-24 overflow-hidden rounded-card border border-border bg-surface shadow-card">
            <SectionHeader icon={Database} title="Domänmodell" href="/model/domain" action="Öppna domän" />
            <ul className="divide-y divide-border">
              <ObjectRow name="Entiteter" contractName="Entity" countLabel="objekt" count={entities.length} description="Data som projektet äger.">
                <CreateLink href="/model/domain/entities/new">entitet</CreateLink>
              </ObjectRow>
              <ObjectRow name="Fält" contractName="Field" countLabel="fält" count={fields.length} description="Typer, värden och ordning på en Entity.">
                <CreateLink href="/model/domain/fields/new">fält</CreateLink>
              </ObjectRow>
              <ObjectRow name="Relationer" contractName="Relation" countLabel="relationer" count={relations.length} description="Kopplingar mellan Entities.">
                <CreateLink href="/model/domain/relations/new">relation</CreateLink>
              </ObjectRow>
            </ul>
          </section>

          <section id="model-api" className="scroll-mt-24 overflow-hidden rounded-card border border-border bg-surface shadow-card">
            <SectionHeader icon={Braces} title="API-kontrakt" href="/model/api" action="Öppna API-karta" />
            <ul className="divide-y divide-border">
              <ObjectRow name="API-resurser" contractName="Resource" countLabel="resurser" count={resources.length} description="API-ytan för en Entity.">
                <CreateLink href="/model/api/resources/new">API-resurs</CreateLink>
              </ObjectRow>
              <ObjectRow name="Operationer" contractName="ApiOperation" countLabel="endpoints" count={operations.length} description="Metod, path, parametrar och request-kontrakt.">
                <CreateLink href="/model/api/operations/new">operation</CreateLink>
              </ObjectRow>
              <ObjectRow name="Svar" contractName="ApiOperationResponse" countLabel="svar" count={responses.length} description="Statuskod och eventuell response body.">
                <CreateLink href="/model/api/responses/new">svar</CreateLink>
              </ObjectRow>
              <ObjectRow name="Svarstyper" contractName="ApiProjection" countLabel="projektioner" count={projections.length} description="Återanvändbara response-kontrakt.">
                <CreateLink href="/model/api/projections/new">projektion</CreateLink>
              </ObjectRow>
            </ul>
          </section>

          <section id="model-frontend" className="scroll-mt-24 overflow-hidden rounded-card border border-border bg-surface shadow-card">
            <SectionHeader icon={PanelTop} title="Frontend och åtkomst" href="/model/frontend" action="Öppna frontend" />
            <ul className="divide-y divide-border">
              <ObjectRow name="Skärmar" contractName="Screen" countLabel="skärmar" count={screens.length} description="Frontendrutter och den domändata varje vy använder.">
                <CreateLink href="/model/frontend/screens/new">skärm</CreateLink>
              </ObjectRow>
              <ObjectRow name="Providers" contractName="Provider" countLabel="providers" count={providers.length} description="Dataflöde från frontend till valda API-resurser.">
                <CreateLink href="/model/frontend/providers/new">provider</CreateLink>
              </ObjectRow>
              <ObjectRow name="Roller" contractName="Role" countLabel="roller" count={roles.length} description="Frontendens åtkomstmatris per API-operation och scope.">
                <CreateLink href="/model/frontend/roles/new">roll</CreateLink>
              </ObjectRow>
            </ul>
          </section>

          <section id="model-integrations" className="scroll-mt-24 overflow-hidden rounded-card border border-border bg-surface shadow-card">
            <SectionHeader icon={Cable} title="Integrationer" href="/model/integrations" action="Öppna integrationer" />
            <ul className="divide-y divide-border">
              <ObjectRow name="System" contractName="Integration" countLabel="system" count={integrations.length} description="Bas-URL, auth och driftvärden.">
                <CreateLink href="/model/integrations/new">integration</CreateLink>
              </ObjectRow>
              <ObjectRow name="Externa operationer" contractName="IntegrationOperation" countLabel="anrop" count={integrationOperations.length} description="Anrop, mapping och synk.">
                <CreateLink href="/model/integrations/operations/new">operation</CreateLink>
              </ObjectRow>
            </ul>
          </section>

          <section id="model-delivery" className="scroll-mt-24 overflow-hidden rounded-card border border-border bg-surface shadow-card">
            <SectionHeader icon={PackageCheck} title="Leverans" href="/model/delivery" action="Öppna leverans" />
            <ul className="divide-y divide-border">
              <ObjectRow name="Kodgenerator" contractName="Scaffold" countLabel="kodtargets" count={6} description="Genererar underlag för Django, TypeScript, C#, design, integration och skeleton.">
                <Link href="/model/scaffold" className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-accent/40 px-3 text-sm font-medium text-accent no-underline hover:bg-accent/10 sm:w-auto">Öppna kodgeneratorn</Link>
              </ObjectRow>
              <ObjectRow name="Stackprofil" contractName="StackProfile" countLabel="profil" count={design.stack_profile ? 1 : 0} description="Targets, auth, databas och namngivning.">
                <CreateLink href="/model/delivery/stack">stackprofil</CreateLink>
              </ObjectRow>
              <ObjectRow name="Startvärden" contractName="SeedRow" countLabel="värden" count={seedRows.length} description="Förvalda värden som hör till en Entity.">
                <CreateLink href="/model/delivery/seeds/new">startvärde</CreateLink>
              </ObjectRow>
            </ul>
          </section>
        </main>
      </div>
    </div>
  )
}
