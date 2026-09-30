import Link from "next/link"
import { ChevronRight, DatabaseZap, FileCode2, Plus, ServerCog } from "lucide-react"
import { loadApiWorkbenchData } from "../api/api-data"
import { ActionLink, ModelPageHeader, ModelSection, RowLink } from "../model-ui"

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right font-mono text-text">{children}</dd>
    </div>
  )
}

export default async function DeliveryPage() {
  const data = await loadApiWorkbenchData()
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att öppna leveransunderlaget.</p>

  const { design } = data
  const entities = design.entities ?? []
  const seedRows = design.seed_rows ?? []
  const stack = design.stack_profile
  const seededEntities = entities.filter((entity) => seedRows.some((row) => row.entity === entity.id))

  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModelPageHeader
        title="Leverans"
        description="Teknikval, startdata och koden Flux genererar från specifikationen."
        actions={
          <>
            <ActionLink href="/model/scaffold" variant="primary"><FileCode2 size={15} aria-hidden /> Öppna kodgeneratorn</ActionLink>
            <ActionLink href="/model/delivery/seeds/new">Nytt startvärde</ActionLink>
          </>
        }
      />

      <ModelSection
        id="delivery-stack"
        label="Stackprofil"
        icon={<ServerCog size={17} className="text-accent" aria-hidden />}
        title="Stackprofil"
        actions={<RowLink href="/model/delivery/stack">{stack ? "Ändra" : "Skapa"}</RowLink>}
      >
        {stack ? (
          <dl className="divide-y divide-border px-4 py-1 sm:px-5">
            <Detail label="Kodtargets">{stack.targets.join(", ") || "inga"}</Detail>
            <Detail label="Databas">{stack.database}</Detail>
            <Detail label="Inloggning">{stack.auth_method}</Detail>
            <Detail label="App och namespace">{stack.app_label} · {stack.namespace}</Detail>
            <Detail label="API-namngivning">{stack.api_naming}</Detail>
          </dl>
        ) : (
          <p className="px-4 py-4 text-sm text-text-muted sm:px-5">
            Ingen stackprofil än. Den bestämmer vilka ramverk, vilken databas och vilken inloggning koden genereras för. <Link href="/model/delivery/stack" className="text-accent">Skapa stackprofil</Link>
          </p>
        )}
      </ModelSection>

      <ModelSection
        id="delivery-seeds"
        label="Startvärden"
        icon={<DatabaseZap size={17} className="text-accent" aria-hidden />}
        title={<>Startvärden <span className="ml-1 text-sm font-normal text-text-muted">{seedRows.length}</span></>}
        actions={<RowLink href="/model/delivery/seeds/new">Nytt startvärde</RowLink>}
      >
        <ul className="divide-y divide-border">
          {seededEntities.map((entity) => {
            const rows = seedRows.filter((row) => row.entity === entity.id).sort((a, b) => a.order - b.order)
            return (
              <li key={entity.id} className="px-4 py-3 sm:px-5">
                <div className="flex items-center justify-between gap-4">
                  <Link href={"/model/domain?entity=" + entity.id + "#entity-" + entity.id} className="font-mono text-sm font-semibold text-text no-underline hover:text-accent">{entity.name}</Link>
                  <RowLink href={"/model/delivery/seeds/new?entity=" + entity.id}><Plus size={13} aria-hidden /> Rad</RowLink>
                </div>
                <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-bg/40">
                  {rows.map((row) => (
                    <li key={row.id}>
                      <Link href={"/model/delivery/seeds/" + row.id + "/edit"} className="group flex items-center gap-3 px-3 py-2 no-underline hover:bg-surface-2">
                        <span className="shrink-0 text-xs tabular-nums text-text-faint">{row.order}</span>
                        <span className="min-w-0 flex-1 truncate font-mono text-xs text-text-muted group-hover:text-text">
                          {Object.entries(row.data).map(([key, value]) => key + ": " + String(value)).join(" · ")}
                        </span>
                        <ChevronRight size={14} aria-hidden className="shrink-0 text-text-faint group-hover:text-accent" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
          {seedRows.length === 0 && (
            <li className="px-4 py-4 text-sm text-text-muted sm:px-5">Inga startvärden än. Startvärden är data som ska finnas från start, till exempel statusar eller kategorier.</li>
          )}
        </ul>
      </ModelSection>

      <ModelSection
        id="delivery-scaffold"
        label="Kodgenerator"
        icon={<FileCode2 size={17} className="text-accent" aria-hidden />}
        title="Kodgenerator"
        actions={<RowLink href="/model/scaffold">Öppna</RowLink>}
      >
        <div className="px-4 py-4 text-sm leading-6 text-text-muted sm:px-5">
          <p>Genererar färdiga filer för Django, TypeScript, C#, design tokens, integrationer och ett projektskelett. Välj target, granska filerna och spara resultatet när du vill behålla det.</p>
        </div>
      </ModelSection>
    </div>
  )
}
