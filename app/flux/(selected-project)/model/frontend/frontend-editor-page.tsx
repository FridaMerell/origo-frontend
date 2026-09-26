import { notFound } from "next/navigation"
import { loadApiWorkbenchData } from "../api/api-data"
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
    ? "En roll får åtkomst genom explicita API-operationer och deras scope."
    : "Kopplingar mellan screen, entitet, roll och API-operation sparas som explicita designrelationer."
  return (
    <div className="flex flex-col gap-6 pb-12">
      <header className="border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-text-faint">Klientgränser</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-text">
          {recordId ? "Redigera " + label : "Ny " + label}
        </h1>
        <p className="mt-2 text-sm text-text-muted">{description}</p>
      </header>
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
