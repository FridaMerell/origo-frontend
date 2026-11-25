import { DomainEditorPage } from "../../domain-editor-page"
import { modelProjectMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export function generateMetadata() {
  return modelProjectMetadata(
    (projectName) => ({
      title: `Ny entitet i ${projectName} | Flux`,
      description: `Lägg till en entitet i domänmodellen för ${projectName}.`,
    }),
    { title: "Ny entitet | Flux", description: "Lägg till en entitet i projektets domänmodell." },
  )
}

export default function NewEntityPage() {
  return <DomainEditorPage kind="entity" />
}
