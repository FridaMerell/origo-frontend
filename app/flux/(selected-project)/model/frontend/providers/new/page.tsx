import { ProviderGeneratorForm } from "../../provider-generator-form"
import { loadApiWorkbenchData } from "../../../api/api-data"
import { ModelPageHeader } from "../../../model-ui"

export default async function NewProviderGeneratorPage() {
  const data = await loadApiWorkbenchData()
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att skapa en provider.</p>

  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModelPageHeader
        back={{ href: "/model/frontend", label: "Frontend och åtkomst" }}
        title="Ny provider"
        description="Välj vilka API-resurser providern hämtar data från och granska koden innan du sparar."
      />
      <ProviderGeneratorForm projectId={data.projectId} entities={data.design.entities} resources={data.design.resources} />
    </div>
  )
}
