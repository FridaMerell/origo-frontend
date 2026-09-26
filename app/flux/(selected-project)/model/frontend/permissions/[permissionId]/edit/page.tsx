import { FrontendEditorPage } from "../../../frontend-editor-page"

export default async function EditPermissionPage({ params }: { params: Promise<{ permissionId: string }> }) {
  const { permissionId } = await params
  return <FrontendEditorPage kind="permission" recordId={Number(permissionId)} />
}
