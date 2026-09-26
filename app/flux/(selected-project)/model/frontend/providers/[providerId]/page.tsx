import Link from "next/link"
import { notFound } from "next/navigation"
import { getFluxScaffold } from "@/app/lib/dal/flux"
import { ProviderGeneratorForm } from "../../provider-generator-form"
import { loadApiWorkbenchData } from "../../../api/api-data"

function snake(value: string) {
  return (value.match(/[A-Z]+(?=[A-Z][a-z])|[A-Z]?[a-z]+\d*|[A-Z]+\d*|\d+/g) ?? []).map((word) => word.toLowerCase()).join("_")
}

export default async function ProviderGeneratorPage({ params }: { params: Promise<{ providerId: string }> }) {
  const [{ providerId }, data] = await Promise.all([params, loadApiWorkbenchData()])
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att öppna Provider-generatorn.</p>

  const provider = data.design.providers.find((item) => item.id === Number(providerId))
  if (!provider) notFound()
  const scaffold = await getFluxScaffold(data.projectId, "typescript")
  const generatedCode = scaffold?.files.find((file) => file.path === `providers/${snake(provider.name)}-provider.tsx`)?.content

  return <div className="flex flex-col gap-6 pb-12"><header className="border-b border-border pb-5"><Link href="/model/frontend" className="text-sm text-text-muted hover:text-accent">Frontend och åtkomst</Link><p className="mt-4 text-xs font-semibold uppercase tracking-[.14em] text-text-faint">Klientgräns</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-text">{provider.name}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">Redigera resursurvalet och se precis vilken Provider-modul som TypeScript-generatorn producerar.</p></header><ProviderGeneratorForm projectId={data.projectId} entities={data.design.entities} resources={data.design.resources} provider={provider} generatedCode={generatedCode} /></div>
}
