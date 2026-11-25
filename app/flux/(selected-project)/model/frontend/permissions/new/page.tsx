import { FrontendEditorPage } from "../../frontend-editor-page"
import { modelProjectMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export function generateMetadata() {
  return modelProjectMetadata(
    (projectName) => ({
      title: `Ny behörighet i ${projectName} | Flux`,
      description: `Ge en roll i ${projectName} tillgång till en API-operation, med valt omfång.`,
    }),
    { title: "Ny behörighet | Flux", description: "Ge en roll tillgång till en API-operation, med valt omfång." },
  )
}

export default function NewPermissionPage() {
  return <FrontendEditorPage kind="permission" />
}
