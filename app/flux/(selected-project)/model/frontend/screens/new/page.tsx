import { FrontendEditorPage } from "../../frontend-editor-page"
import { modelProjectMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export function generateMetadata() {
  return modelProjectMetadata(
    (projectName) => ({
      title: `Ny skärm i ${projectName} | Flux`,
      description: `Lägg till en skärm i frontend-designen för ${projectName}.`,
    }),
    { title: "Ny skärm | Flux", description: "Lägg till en skärm i projektets frontend-design." },
  )
}

export default function NewScreenPage() {
  return <FrontendEditorPage kind="screen" />
}
