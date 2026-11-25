import { DomainEditorPage } from "../../domain-editor-page"
import { modelProjectMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export function generateMetadata() {
  return modelProjectMetadata(
    (projectName) => ({
      title: `Nytt fält i ${projectName} | Flux`,
      description: `Lägg till ett fält med typ och egenskaper på en entitet i ${projectName}.`,
    }),
    { title: "Nytt fält | Flux", description: "Lägg till ett fält med typ och egenskaper på en entitet i domänmodellen." },
  )
}

export default function NewFieldPage() {
  return <DomainEditorPage kind="field" />
}
