import { StackProfileEditor } from "../stack-profile-editor"
import { loadApiWorkbenchData } from "../../api/api-data"
import { ModelPageHeader } from "../../model-ui"

export default async function StackProfilePage() {
  const data = await loadApiWorkbenchData()
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att redigera stackprofilen.</p>
  const profile = data.design.stack_profile
  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModelPageHeader
        back={{ href: "/model/delivery", label: "Leverans" }}
        title={profile ? "Ändra stackprofil" : "Ny stackprofil"}
        description="Välj ramverk, databas och inloggning som koden ska genereras för."
      />
      <StackProfileEditor projectId={data.projectId} profile={profile ?? undefined} />
    </div>
  )
}
