import Link from "next/link"
import { ProviderGeneratorForm } from "../../provider-generator-form"
import { loadApiWorkbenchData } from "../../../api/api-data"

export default async function NewProviderGeneratorPage() {
  const data = await loadApiWorkbenchData()
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att skapa en Provider.</p>

  return <div className="flex flex-col gap-6 pb-12"><header className="border-b border-border pb-5"><Link href="/model/frontend" className="text-sm text-text-muted hover:text-accent">Frontend och åtkomst</Link><p className="mt-4 text-xs font-semibold uppercase tracking-[.14em] text-text-faint">Klientgräns</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-text">Ny Provider</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">Välj Resources, se den TypeScript-provider som Python-generatorn bygger och spara först när gränsen är rätt.</p></header><ProviderGeneratorForm projectId={data.projectId} entities={data.design.entities} resources={data.design.resources} /></div>
}
