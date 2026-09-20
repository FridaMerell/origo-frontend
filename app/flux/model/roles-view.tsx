"use client"

import { useMemo, useState } from "react"
import { PencilIcon, PlusIcon } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { DeleteButton } from "@/app/components/ui/DeleteButton"
import { AppLink as Link } from "@/app/components/ui/AppLink"
import { deleteRole, setRolePermission } from "@/app/actions/flux/design"
import { fieldInputClass } from "@/app/components/form/Field"
import { FLUX_OPERATIONS } from "@/app/lib/schemas"
import type { FluxOperation, FluxPermissionScope, FluxResource, FluxRole, FluxRolePermission } from "@/app/lib/dal"
import { useModel } from "./model-context"
import { OPERATION_LABELS } from "./resource-form-drawer"
import { RoleFormDrawer } from "./role-form-drawer"

const SCOPE_LABELS: Record<FluxPermissionScope | "none", string> = {
  none: "–",
  all: "Alla",
  own: "Egna",
  member: "Medlem",
}

export function RolesView({
  initialRoles,
  initialResources,
  initialPermissions,
}: {
  initialRoles: FluxRole[]
  initialResources: FluxResource[]
  initialPermissions: FluxRolePermission[]
}) {
  const { projectId, entities } = useModel()
  const [roles, setRoles] = useState(initialRoles)
  const [permissions, setPermissions] = useState(initialPermissions)
  const [selectedId, setSelectedId] = useState<number | null>(initialRoles[0]?.id ?? null)
  const [drawer, setDrawer] = useState<{ open: boolean; role?: FluxRole }>({ open: false })
  const [error, setError] = useState<string | null>(null)

  const selected = roles.find((role) => role.id === selectedId) ?? null
  const entityName = (id: number) => entities.find((entity) => entity.id === id)?.name ?? "?"
  const rolePermissions = useMemo(() => permissions.filter((item) => item.role === selectedId), [permissions, selectedId])

  const permissionFor = (resource: number, operation: FluxOperation) =>
    rolePermissions.find((item) => item.resource === resource && item.operation === operation)

  const change = async (resource: FluxResource, operation: FluxOperation, value: string) => {
    if (!selected) return
    const existing = permissionFor(resource.id, operation)
    const scope = value === "none" ? null : (value as FluxPermissionScope)
    setError(null)
    const result = await setRolePermission(selected.id, resource.id, operation, existing?.id ?? null, scope)
    if (result?.error) {
      setError(result.error)
      return
    }
    setPermissions((prev) => {
      const rest = prev.filter((item) => item.id !== existing?.id)
      return result?.data ? [...rest, result.data] : rest
    })
  }

  const removeRole = async (role: FluxRole) => {
    const snapshot = { roles, permissions, selectedId }
    setRoles((prev) => prev.filter((item) => item.id !== role.id))
    setPermissions((prev) => prev.filter((item) => item.role !== role.id))
    setSelectedId((prev) => (prev === role.id ? roles.find((item) => item.id !== role.id)?.id ?? null : prev))
    const result = await deleteRole(role.id)
    if (result?.error) {
      setRoles(snapshot.roles)
      setPermissions(snapshot.permissions)
      setSelectedId(snapshot.selectedId)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelectedId(role.id)}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                role.id === selectedId
                  ? "border-border-strong bg-surface-2 text-text"
                  : "border-border bg-surface text-text-muted hover:bg-surface-2/60"
              }`}
            >
              {role.name}
            </button>
          ))}
        </div>
        <Button variant="secondary" size="sm" onClick={() => setDrawer({ open: true })}>
          <PlusIcon size={14} />
          Ny roll
        </Button>
      </div>

      {roles.length === 0 && (
        <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-text-muted">
          Inga roller än. Skapa en roll och sätt sedan behörigheter per resurs.
        </p>
      )}

      {selected && (
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface p-4">
            <div className="min-w-0">
              <h2 className="text-lg font-medium text-text">{selected.name}</h2>
              {selected.description && <p className="mt-1 text-sm text-text-muted">{selected.description}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label="Redigera roll"
                className="rounded-md p-1 text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
                onClick={() => setDrawer({ open: true, role: selected })}
              >
                <PencilIcon size={14} />
              </button>
              <DeleteButton
                label="Ta bort roll"
                confirmTitle="Ta bort roll"
                confirmMessage="Ta bort rollen och dess behörigheter? Det går inte att återställa."
                showTitle
                className="rounded-md p-1 text-text-faint transition-colors hover:bg-danger-wash hover:text-danger disabled:opacity-50"
                onDelete={() => removeRole(selected)}
              />
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}

          {initialResources.length === 0 ? (
            <p className="text-sm text-text-muted">
              Det finns inga resurser att sätta behörigheter på. <Link href="/model/resources" className="underline">Skapa resurser</Link> först.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-faint">
                    <th className="px-4 py-2 font-semibold">Resurs</th>
                    {FLUX_OPERATIONS.map((operation) => (
                      <th key={operation} className="px-2 py-2 font-semibold">{OPERATION_LABELS[operation]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {initialResources.map((resource) => (
                    <tr key={resource.id}>
                      <td className="px-4 py-2 text-text">
                        {entityName(resource.entity)}
                        <span className="ml-2 font-mono text-xs text-text-faint">/{resource.path}/</span>
                      </td>
                      {FLUX_OPERATIONS.map((operation) => {
                        const current = permissionFor(resource.id, operation)
                        // An operation removed from the resource can still hold a permission; keep it clearable.
                        const enabled = resource.operations.includes(operation) || Boolean(current)
                        return (
                          <td key={operation} className="px-2 py-1.5">
                            <select
                              aria-label={`${entityName(resource.entity)} ${OPERATION_LABELS[operation]}`}
                              className={`${fieldInputClass} w-full py-1 text-xs disabled:opacity-40`}
                              disabled={!enabled}
                              value={current?.scope ?? "none"}
                              onChange={(event) => change(resource, operation, event.target.value)}
                            >
                              {(Object.keys(SCOPE_LABELS) as (FluxPermissionScope | "none")[]).map((scope) => (
                                <option key={scope} value={scope}>{SCOPE_LABELS[scope]}</option>
                              ))}
                            </select>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <RoleFormDrawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false })}
        projectId={projectId}
        role={drawer.role}
        onSaved={(saved) => {
          setRoles((prev) => (prev.some((item) => item.id === saved.id) ? prev.map((item) => (item.id === saved.id ? saved : item)) : [...prev, saved]))
          setSelectedId(saved.id)
        }}
      />
    </div>
  )
}
