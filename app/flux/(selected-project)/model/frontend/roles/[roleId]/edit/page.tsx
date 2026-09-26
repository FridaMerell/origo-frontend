import { FrontendEditorPage } from "../../../frontend-editor-page"

export default async function EditRolePage({ params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params
  return <FrontendEditorPage kind="role" recordId={Number(roleId)} />
}
