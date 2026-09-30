import { notFound } from "next/navigation"
import { getFluxScaffold } from "@/app/lib/dal/flux"
import { ProviderGeneratorForm } from "../../provider-generator-form"
import { loadApiWorkbenchData } from "../../../api/api-data"
import { ModelPageHeader } from "../../../model-ui"

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

  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModelPageHeader
        back={{ href: "/model/frontend", label: "Frontend och åtkomst" }}
        title={provider.name}
        description="Ändra vilka API-resurser providern hämtar från och se koden som genereras."
      />
      <ProviderGeneratorForm projectId={data.projectId} entities={data.design.entities} resources={data.design.resources} provider={provider} generatedCode={generatedCode} />
    </div>
  )
}
