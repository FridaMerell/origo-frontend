import Link from "next/link"
import { StackProfileEditor } from "../stack-profile-editor"
import { loadApiWorkbenchData } from "../../api/api-data"

export default async function StackProfilePage() {
  const data = await loadApiWorkbenchData()
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att redigera stackprofilen.</p>
  const profile = data.design.stack_profile
  return <div className="flex flex-col gap-6 pb-12"><header className="border-b border-border pb-5"><Link href="/model/delivery" className="text-sm text-text-muted hover:text-accent">Leveransunderlag</Link><p className="mt-4 text-xs font-semibold uppercase tracking-[.14em] text-text-faint">Stack</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-text">{profile ? "Redigera stackprofil" : "Ny stackprofil"}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">Välj targets och konfigurationsvärden för den genererade lösningen.</p></header><StackProfileEditor projectId={data.projectId} profile={profile ?? undefined} /></div>
}
