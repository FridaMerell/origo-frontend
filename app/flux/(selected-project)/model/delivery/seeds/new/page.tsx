import Link from "next/link"
import { SeedRowEditor } from "../../seed-row-editor"
import { loadApiWorkbenchData } from "../../../api/api-data"

export default async function NewSeedRowPage() {
  const data = await loadApiWorkbenchData()
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att skapa seeddata.</p>
  return <div className="flex flex-col gap-6 pb-12"><header className="border-b border-border pb-5"><Link href="/model/delivery" className="text-sm text-text-muted hover:text-accent">Leveransunderlag</Link><p className="mt-4 text-xs font-semibold uppercase tracking-[.14em] text-text-faint">Seeddata</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-text">Ny seedrad</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">Välj Entity och fyll i dess fält och relationer.</p></header><SeedRowEditor entities={data.design.entities} fields={data.design.fields} relations={data.design.relations} /></div>
}
