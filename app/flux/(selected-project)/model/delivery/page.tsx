import Link from "next/link"
import { ArrowRight, DatabaseZap, FileCode2, ServerCog } from "lucide-react"
import { loadApiWorkbenchData } from "../api/api-data"

export default async function DeliveryPage() {
  const data = await loadApiWorkbenchData()
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att öppna leveransunderlaget.</p>

  const { design } = data
  const entities = design.entities ?? []
  const seedRows = design.seed_rows ?? []
  const stack = design.stack_profile

  return (
    <div className="flex flex-col gap-7 pb-12">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-5 sm:items-end">
        <div>
          <Link href="/model" className="text-sm text-text-muted hover:text-accent">Teknisk dokumentation</Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[.14em] text-text-faint">Leveransunderlag</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-text">Stack, seeddata och generering</h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">Designvärdena här styr scaffold-motorn och de genererade filerna.</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 text-sm sm:flex sm:w-auto sm:flex-wrap sm:gap-x-4 sm:gap-y-2">
          <Link href="/model/delivery/stack" className="inline-flex min-h-10 items-center font-medium text-accent no-underline hover:underline">Stackprofil</Link>
          <Link href="/model/delivery/seeds/new" className="inline-flex min-h-10 items-center font-medium text-accent no-underline hover:underline">Ny seedrad</Link>
          <Link href="/model/scaffold" className="inline-flex min-h-10 items-center font-medium text-accent no-underline hover:underline">Öppna generatorn</Link>
        </div>
      </header>

      <section className="border-y border-border py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ServerCog size={18} className="text-accent" />
            <h2 className="font-semibold text-text">Stackprofil</h2>
          </div>
          <Link href="/model/delivery/stack" className="text-sm text-accent no-underline hover:underline">{stack ? "Redigera stackprofil" : "Skapa stackprofil"}</Link>
        </div>
        {stack ? (
          <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <dt className="text-text-faint">Targets</dt>
              <dd className="mt-1 font-mono text-text">{stack.targets.join(" · ") || "inga"}</dd>
            </div>
            <div>
              <dt className="text-text-faint">Databas / auth</dt>
              <dd className="mt-1 font-mono text-text">{stack.database} · {stack.auth_method}</dd>
            </div>
            <div>
              <dt className="text-text-faint">App / namespace</dt>
              <dd className="mt-1 break-words font-mono text-text">{stack.app_label} · {stack.namespace}</dd>
            </div>
            <div>
              <dt className="text-text-faint">API-namngivning</dt>
              <dd className="mt-1 font-mono text-text">{stack.api_naming}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-text-muted">Ingen StackProfile är specificerad.</p>
        )}
      </section>

      <section className="border-y border-border py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileCode2 size={18} className="text-accent" />
            <h2 className="font-semibold text-text">Interaktiv kodgenerator</h2>
          </div>
          <Link href="/model/scaffold" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent no-underline hover:underline">
            Välj target och filer <ArrowRight size={15} />
          </Link>
        </div>
        <p className="mt-3 text-sm leading-6 text-text-muted">Django, TypeScript, C#, design, integration och skeleton finns tillgängliga per fil. Spara ett scaffold-dokument från generatorn när underlaget ska bevaras.</p>
      </section>

      <section className="border-y border-border">
        <header className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-2">
            <DatabaseZap size={18} className="text-accent" />
            <div>
              <h2 className="font-semibold text-text">Seeddata</h2>
              <p className="mt-1 text-sm text-text-muted">Varje rad hör till en Entity och kan bara innehålla dess kända fält och relationer.</p>
            </div>
          </div>
          <span className="font-mono text-xs text-text-muted">{seedRows.length} rader</span>
        </header>
        <ul className="divide-y divide-border">
          {entities.filter((entity) => seedRows.some((row) => row.entity === entity.id)).map((entity) => {
            const rows = seedRows.filter((row) => row.entity === entity.id).sort((a, b) => a.order - b.order)
            return (
              <li key={entity.id} className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <Link href={"/model/domain?entity=" + entity.id + "#entity-" + entity.id} className="font-mono text-sm font-semibold text-text no-underline hover:text-accent">{entity.name}</Link>
                  <span className="text-xs text-text-faint">{rows.length} rader</span>
                </div>
                <ul className="mt-3 divide-y divide-border border-l border-border">
                  {rows.map((row) => (
                    <li key={row.id}>
                  <Link href={"/model/delivery/seeds/" + row.id + "/edit"} className="group grid gap-2 py-3 pl-4 no-underline hover:bg-surface-2 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-center">
                        <span className="font-mono text-xs text-accent">rad {row.order}</span>
                        <span className="break-words font-mono text-xs text-text-muted">{Object.entries(row.data).map(([key, value]) => key + ": " + String(value)).join(" · ")}</span>
                        <ArrowRight size={15} className="hidden text-text-faint group-hover:text-accent sm:block" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
          {seedRows.length === 0 && <li className="py-4 text-sm text-text-muted">Ingen seeddata är specificerad. <Link href="/model/delivery/seeds/new" className="text-accent">Skapa första raden.</Link></li>}
        </ul>
      </section>

      <section className="divide-y divide-border border-y border-border">
        <div className="grid gap-2 py-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
          <p className="font-mono text-xs text-text">GET scaffold/?target=</p>
          <p className="text-sm text-text-muted">Returnerar faktiska filobjekt med path och content.</p>
        </div>
        <div className="grid gap-2 py-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
          <p className="font-mono text-xs text-text">POST scaffold-document/</p>
          <p className="text-sm text-text-muted">Sparar target-resultatet först efter ditt uttryckliga val.</p>
        </div>
        <div className="grid gap-2 py-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
          <p className="font-mono text-xs text-text">POST generate-tasks/</p>
          <p className="text-sm text-text-muted">Skapar en starter-backlog från befintlig design.</p>
        </div>
      </section>
    </div>
  )
}
