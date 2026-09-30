import { notFound } from "next/navigation"
import { loadApiWorkbenchData } from "../api/api-data"
import { ModelPageHeader } from "../model-ui"
import { FrontendEditorForm } from "./frontend-editor-form"
import { RolePermissionMatrix } from "./role-permission-matrix"
import type { FrontendContractKind } from "./_actions/contracts"

export async function FrontendEditorPage({
  kind,
  recordId,
}: {
  kind: FrontendContractKind
  recordId?: number
}) {
  const data = await loadApiWorkbenchData()
  if (!data) return <p className="text-sm text-text-muted">Välj ett projekt för att redigera klientgränserna.</p>

  const screen = kind === "screen" && recordId ? data.design.screens.find((item) => item.id === recordId) : undefined
  const role = kind === "role" && recordId ? data.design.roles.find((item) => item.id === recordId) : undefined
  const permission = kind === "permission" && recordId ? data.design.role_permissions.find((item) => item.id === recordId) : undefined
  if (recordId && !screen && !role && !permission) notFound()

  const label = kind === "screen" ? "skärm" : kind === "role" ? "roll" : "behörighet"
  const description = kind === "role"
    ? "Välj vilka API-operationer rollen får anropa och för vilka poster."
    : kind === "screen"
      ? "En skärm är en route i appen och den domändata den visar."
      : "Koppla en roll till en API-operation och bestäm vilka poster den gäller."
  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModelPageHeader
        back={{ href: "/model/frontend", label: "Frontend och åtkomst" }}
        title={(recordId ? "Redigera " : "Ny ") + label}
        description={description}
      />
      <FrontendEditorForm
        kind={kind}
        projectId={data.projectId}
        entities={data.design.entities}
        operations={data.design.api_operations}
        roles={data.design.roles}
        screens={data.design.screens}
        screen={screen}
        role={role}
        permission={permission}
      />
      {role && (
        <RolePermissionMatrix
          projectId={data.projectId}
          role={role}
          resources={data.design.resources}
          operations={data.design.api_operations}
          permissions={data.design.role_permissions}
        />
      )}
    </div>
  )
}
