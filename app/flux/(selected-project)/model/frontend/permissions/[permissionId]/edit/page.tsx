import { FrontendEditorPage } from "../../../frontend-editor-page"
import { modelRecordMetadata } from "@/app/flux/(selected-project)/model/model-metadata"

export async function generateMetadata({ params }: { params: Promise<{ permissionId: string }> }) {
  const { permissionId } = await params
  return modelRecordMetadata(
    (design) => {
      const permission = design.role_permissions.find((item) => item.id === Number(permissionId))
      const role = design.roles.find((item) => item.id === permission?.role)
      const operation = design.api_operations.find((item) => item.id === permission?.api_operation)
      return permission && role && operation ? { role, operation } : undefined
    },
    ({ role, operation }) => ({
      title: `Redigera behörighet för ${role.name} | ${operation.title} | Flux`,
      description: `Ändra om rollen ${role.name} får använda ${operation.method} ${operation.path}, och med vilket omfång.`,
    }),
    {
      title: "Redigera behörighet | Flux",
      description: "Ändra vilken API-operation en roll får använda och med vilket omfång.",
    },
  )
}

export default async function EditPermissionPage({ params }: { params: Promise<{ permissionId: string }> }) {
  const { permissionId } = await params
  return <FrontendEditorPage kind="permission" recordId={Number(permissionId)} />
}
