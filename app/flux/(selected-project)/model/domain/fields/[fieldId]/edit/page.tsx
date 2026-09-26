import { DomainEditorPage } from "../../../domain-editor-page"

export default async function EditFieldPage({ params }: { params: Promise<{ fieldId: string }> }) {
  const { fieldId } = await params
  return <DomainEditorPage kind="field" recordId={Number(fieldId)} />
}
