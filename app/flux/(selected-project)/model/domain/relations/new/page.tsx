import { DomainEditorPage } from "../../domain-editor-page"
import { modelProjectMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export function generateMetadata() {
  return modelProjectMetadata(
    (projectName) => ({
      title: `Ny relation i ${projectName} | Flux`,
      description: `Koppla ihop två entiteter med en relation i domänmodellen för ${projectName}.`,
    }),
    { title: "Ny relation | Flux", description: "Koppla ihop två entiteter med en relation i domänmodellen." },
  )
}

export default function NewRelationPage() {
  return <DomainEditorPage kind="relation" />
}
