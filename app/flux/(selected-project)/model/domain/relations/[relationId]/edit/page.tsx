import { DomainEditorPage } from "../../../domain-editor-page"

export default async function EditRelationPage({ params }: { params: Promise<{ relationId: string }> }) {
  const { relationId } = await params
  return <DomainEditorPage kind="relation" recordId={Number(relationId)} />
}
