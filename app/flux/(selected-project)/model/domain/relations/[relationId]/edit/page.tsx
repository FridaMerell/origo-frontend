import { DomainEditorPage } from "../../../domain-editor-page"
import { modelRecordMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export async function generateMetadata({ params }: { params: Promise<{ relationId: string }> }) {
  const { relationId } = await params
  return modelRecordMetadata(
    (design) => {
      const relation = design.relations.find((item) => item.id === Number(relationId))
      const source = design.entities.find((item) => item.id === relation?.source)
      const target = design.entities.find((item) => item.id === relation?.target)
      return relation && source && target ? { relation, source, target } : undefined
    },
    ({ relation, source, target }) => ({
      title: `Redigera ${source.name}.${relation.name} | Relation | Flux`,
      description: `Ändra relationen ${relation.name} från ${source.name} till ${target.name}.`,
    }),
    {
      title: "Redigera relation | Flux",
      description: "Ändra kardinalitet och riktning för en relation mellan två entiteter.",
    },
  )
}

export default async function EditRelationPage({ params }: { params: Promise<{ relationId: string }> }) {
  const { relationId } = await params
  return <DomainEditorPage kind="relation" recordId={Number(relationId)} />
}
