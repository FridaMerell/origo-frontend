import { DomainEditorPage } from "../../../domain-editor-page"
import { modelRecordMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export async function generateMetadata({ params }: { params: Promise<{ fieldId: string }> }) {
  const { fieldId } = await params
  return modelRecordMetadata(
    (design) => {
      const field = design.fields.find((item) => item.id === Number(fieldId))
      const entity = design.entities.find((item) => item.id === field?.entity)
      return field && entity ? { field, entity } : undefined
    },
    ({ field, entity }) => ({
      title: `Redigera ${entity.name}.${field.name} | Fält | Flux`,
      description: `Ändra typ, namn och egenskaper för fältet ${field.name} på ${entity.name}.`,
    }),
    {
      title: "Redigera fält | Flux",
      description: "Ändra typ, namn och egenskaper för ett fält på en entitet.",
    },
  )
}

export default async function EditFieldPage({ params }: { params: Promise<{ fieldId: string }> }) {
  const { fieldId } = await params
  return <DomainEditorPage kind="field" recordId={Number(fieldId)} />
}
