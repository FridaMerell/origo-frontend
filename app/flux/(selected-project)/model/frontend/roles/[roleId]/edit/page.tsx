import { FrontendEditorPage } from "../../../frontend-editor-page"
import { modelRecordMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export async function generateMetadata({ params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params
  return modelRecordMetadata(
    (design) => design.roles.find((item) => item.id === Number(roleId)),
    (role) => ({
      title: `Redigera ${role.name} | Roll | Flux`,
      description: `Ändra namn och beskrivning för rollen ${role.name}.`,
    }),
    {
      title: "Redigera roll | Flux",
      description: "Ändra namn och beskrivning för en roll i frontend-designen.",
    },
  )
}

export default async function EditRolePage({ params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params
  return <FrontendEditorPage kind="role" recordId={Number(roleId)} />
}
