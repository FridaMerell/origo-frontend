import { FrontendEditorPage } from "../../../frontend-editor-page"
import { modelRecordMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export async function generateMetadata({ params }: { params: Promise<{ screenId: string }> }) {
  const { screenId } = await params
  return modelRecordMetadata(
    (design) => design.screens.find((item) => item.id === Number(screenId)),
    (screen) => ({
      title: `Redigera ${screen.name} | Skärm | Flux`,
      description: `Ändra namn, sökväg och innehåll för skärmen ${screen.name} (${screen.route}).`,
    }),
    {
      title: "Redigera skärm | Flux",
      description: "Ändra sökväg, titel och innehåll för en skärm i frontend-designen.",
    },
  )
}

export default async function EditScreenPage({ params }: { params: Promise<{ screenId: string }> }) {
  const { screenId } = await params
  return <FrontendEditorPage kind="screen" recordId={Number(screenId)} />
}
