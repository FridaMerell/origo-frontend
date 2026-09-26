import { DomainEditorPage } from "../../../domain-editor-page"

export default async function EditEntityPage({ params }: { params: Promise<{ entityId: string }> }) {
  const { entityId } = await params
  return <DomainEditorPage kind="entity" recordId={Number(entityId)} />
}
