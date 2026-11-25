import { DomainEditorPage } from "../../../domain-editor-page"
import { modelRecordMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export async function generateMetadata({ params }: { params: Promise<{ entityId: string }> }) {
  const { entityId } = await params
  return modelRecordMetadata(
    (design) => design.entities.find((item) => item.id === Number(entityId)),
    (entity) => ({
      title: `Redigera ${entity.name} | Entitet | Flux`,
      description: `Ändra namn, beskrivning och inställningar för entiteten ${entity.name}.`,
    }),
    {
      title: "Redigera entitet | Flux",
      description: "Ändra namn, beskrivning och inställningar för en entitet i domänmodellen.",
    },
  )
}

export default async function EditEntityPage({ params }: { params: Promise<{ entityId: string }> }) {
  const { entityId } = await params
  return <DomainEditorPage kind="entity" recordId={Number(entityId)} />
}
