import { FrontendEditorPage } from "../../frontend-editor-page"
import { modelProjectMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export function generateMetadata() {
  return modelProjectMetadata(
    (projectName) => ({
      title: `Ny roll i ${projectName} | Flux`,
      description: `Lägg till en roll i ${projectName} som behörigheter och skärmar kan knytas till.`,
    }),
    { title: "Ny roll | Flux", description: "Lägg till en roll som behörigheter och skärmar kan knytas till." },
  )
}

export default function NewRolePage() {
  return <FrontendEditorPage kind="role" />
}
