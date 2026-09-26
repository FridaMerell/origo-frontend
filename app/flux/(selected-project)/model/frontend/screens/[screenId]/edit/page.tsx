import { FrontendEditorPage } from "../../../frontend-editor-page"

export default async function EditScreenPage({ params }: { params: Promise<{ screenId: string }> }) {
  const { screenId } = await params
  return <FrontendEditorPage kind="screen" recordId={Number(screenId)} />
}
