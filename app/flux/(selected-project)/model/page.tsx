import Link from "next/link"
import { ArrowRight, Braces, Cable, ChevronRight, Database, PackageCheck, PanelTop, Plus, type LucideIcon } from "lucide-react"
import { loadApiWorkbenchData } from "./api/api-data"
import { ModelLaunchControls } from "./model-launch-controls"
import { ModelPageHeader, ModelProgress, ModelSection } from "./model-ui"

type Item = {
  label: string
  count: number
  href: string
  createHref: string
  createLabel: string
  emptyHint: string
  countLabel?: string
}

function AreaSection({
  id,
  icon: Icon,
  title,
  description,
  href,
  items,
  muted = false,
}: {
  id: string
  icon: LucideIcon
  title: string
  description: string
  href: string
  items: Item[]
  muted?: boolean
}) {
  return (
    <ModelSection
      id={id}
      icon={<Icon size={18} className={muted ? "text-text-faint" : "text-accent"} aria-hidden />}
      title={<span>{title} <span className="ml-1.5 text-sm font-normal text-text-muted">{description}</span></span>}
      muted={muted}
      mutedHint="Väntar på domänmodellen"
      actions={
        <Link href={href} className="inline-flex items-center gap-1 font-medium text-accent no-underline hover:underline">
          Öppna <ArrowRight size={14} aria-hidden />
        </Link>
      }
    >
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 pr-4 sm:pr-5">
            <Link href={item.href} className="group flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 no-underline sm:pl-5">
              <span className="text-sm font-medium text-text group-hover:text-accent">{item.label}</span>
              {item.count > 0
                ? <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs tabular-nums text-text-muted">{item.countLabel ?? item.count}</span>
                : <span className="truncate text-sm text-text-faint">{item.emptyHint}</span>}
              <ChevronRight size={15} aria-hidden className="ml-auto shrink-0 text-text-faint opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
            <Link href={item.createHref} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm text-text-muted no-underline hover:bg-surface-2 hover:text-accent">
              {item.createLabel.startsWith("Ny") && <Plus size={14} aria-hidden />} {item.createLabel}
            </Link>
          </li>
        ))}
      </ul>
    </ModelSection>
  )
}

export default async function FluxModelPage() {
  const data = await loadApiWorkbenchData()
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att öppna dess tekniska specifikation.</p>

  const { design, projectName } = data
  const entities = design.entities ?? []
  const scaffoldTarget = design.stack_profile?.targets[0] ?? "typescript"
  const domainEmpty = entities.length === 0

  const apiDone = (design.resources?.length ?? 0) > 0
  const frontendDone = (design.screens?.length ?? 0) > 0
  const integrationsDone = (design.integrations?.length ?? 0) > 0
  const deliveryDone = !!design.stack_profile

  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModelPageHeader
        back={null}
        title={projectName}
        description="Teknisk specifikation: datamodell, API, frontend, integrationer och leverans."
        actions={<ModelLaunchControls projectId={data.projectId} entityCount={entities.length} scaffoldTarget={scaffoldTarget} />}
      />

      <ModelProgress areas={[
        { label: "Domänmodell", href: "#model-domain", done: !domainEmpty },
        { label: "API", href: "#model-api", done: apiDone },
        { label: "Frontend", href: "#model-frontend", done: frontendDone },
        { label: "Integrationer", href: "#model-integrations", done: integrationsDone },
        { label: "Leverans", href: "#model-delivery", done: deliveryDone },
      ]} />

      <AreaSection id="model-domain" icon={Database} title="Domänmodell" description="Data som projektet äger" href="/model/domain" items={[
        { label: "Entiteter", count: entities.length, href: "/model/domain#domain-entities", createHref: "/model/domain/entities/new", createLabel: "Ny entitet", emptyHint: "Börja här – skapa den första entiteten" },
        { label: "Fält", count: design.fields?.length ?? 0, href: "/model/domain#domain-entities", createHref: "/model/domain/fields/new", createLabel: "Nytt fält", emptyHint: "Inga fält än" },
        { label: "Relationer", count: design.relations?.length ?? 0, href: "/model/domain#domain-entities", createHref: "/model/domain/relations/new", createLabel: "Ny relation", emptyHint: "Inga relationer än" },
      ]} />

      <AreaSection id="model-api" icon={Braces} title="API" description="Endpoints och svar" href="/model/api" muted={domainEmpty} items={[
        { label: "Resurser", count: design.resources?.length ?? 0, href: "/model/api#api-resources", createHref: "/model/api/resources/new", createLabel: "Ny resurs", emptyHint: "Inga resurser än" },
        { label: "Operationer", count: design.api_operations?.length ?? 0, href: "/model/api#api-resources", createHref: "/model/api/operations/new", createLabel: "Ny operation", emptyHint: "Inga operationer än" },
        { label: "Svarstyper", count: design.api_projections?.length ?? 0, href: "/model/api#api-contracts", createHref: "/model/api/projections/new", createLabel: "Ny svarstyp", emptyHint: "Inga svarstyper än" },
      ]} />

      <AreaSection id="model-frontend" icon={PanelTop} title="Frontend och åtkomst" description="Skärmar, dataflöde och roller" href="/model/frontend" muted={domainEmpty} items={[
        { label: "Skärmar", count: design.screens?.length ?? 0, href: "/model/frontend#frontend-screens", createHref: "/model/frontend/screens/new", createLabel: "Ny skärm", emptyHint: "Inga skärmar än" },
        { label: "Providers", count: design.providers?.length ?? 0, href: "/model/frontend#frontend-providers", createHref: "/model/frontend/providers/new", createLabel: "Ny provider", emptyHint: "Inga providers än" },
        { label: "Roller", count: design.roles?.length ?? 0, href: "/model/frontend#frontend-roles", createHref: "/model/frontend/roles/new", createLabel: "Ny roll", emptyHint: "Inga roller än" },
      ]} />

      <AreaSection id="model-integrations" icon={Cable} title="Integrationer" description="Externa system och synk" href="/model/integrations" items={[
        { label: "System", count: design.integrations?.length ?? 0, href: "/model/integrations", createHref: "/model/integrations/new", createLabel: "Ny integration", emptyHint: "Inga externa system än" },
        { label: "Externa anrop", count: design.integration_operations?.length ?? 0, href: "/model/integrations", createHref: "/model/integrations/operations/new", createLabel: "Nytt anrop", emptyHint: "Inga anrop än" },
      ]} />

      <AreaSection id="model-delivery" icon={PackageCheck} title="Leverans" description="Stack, startvärden och kodgenerering" href="/model/delivery" muted={domainEmpty} items={[
        { label: "Stackprofil", count: design.stack_profile ? 1 : 0, countLabel: design.stack_profile?.targets.join(", ") || "Klar", href: "/model/delivery#delivery-stack", createHref: "/model/delivery/stack", createLabel: design.stack_profile ? "Ändra" : "Skapa", emptyHint: "Ingen stackprofil än" },
        { label: "Startvärden", count: design.seed_rows?.length ?? 0, href: "/model/delivery#delivery-seeds", createHref: "/model/delivery/seeds/new", createLabel: "Nytt startvärde", emptyHint: "Inga startvärden än" },
        { label: "Kodgenerator", count: 0, href: "/model/scaffold", createHref: "/model/scaffold", createLabel: "Öppna", emptyHint: "Django, TypeScript, C# med flera" },
      ]} />
    </div>
  )
}
