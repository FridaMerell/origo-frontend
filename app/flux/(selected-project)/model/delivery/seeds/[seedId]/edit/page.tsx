import Link from "next/link"
import { notFound } from "next/navigation"
import { SeedRowEditor } from "../../../seed-row-editor"
import { loadApiWorkbenchData } from "../../../../api/api-data"

export default async function EditSeedRowPage({ params }: { params: Promise<{ seedId: string }> }) {
  const [{ seedId }, data] = await Promise.all([params, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att redigera seeddata.</p>
  const row = data.design.seed_rows.find((item) => item.id === Number(seedId))
  if (!row) notFound()
  return <div className="flex flex-col gap-6 pb-12"><header className="border-b border-border pb-5"><Link href="/model/delivery" className="text-sm text-text-muted hover:text-accent">Leveransunderlag</Link><p className="mt-4 text-xs font-semibold uppercase tracking-[.14em] text-text-faint">Seeddata</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-text">Redigera seedrad</h1></header><SeedRowEditor entities={data.design.entities} fields={data.design.fields} relations={data.design.relations} row={row} /></div>
}
