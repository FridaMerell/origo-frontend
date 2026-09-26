"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/Button"
import { Checkbox, Field, fieldInputClass } from "@/app/components/form/Field"
import type { FluxApiOperation, FluxPermissionScope, FluxResource, FluxRole, FluxRolePermission } from "@/app/lib/dal"
import { syncRolePermissions } from "./_actions/contracts"

const scopeLabels: Record<FluxPermissionScope, string> = {
  all: "Alla poster",
  own: "Egna poster",
  member: "Projektmedlemskap",
}

export function RolePermissionMatrix({
  projectId,
  role,
  resources,
  operations,
  permissions,
}: {
  projectId: string
  role: FluxRole
  resources: FluxResource[]
  operations: FluxApiOperation[]
  permissions: FluxRolePermission[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState<string | null>(null)
  const [grants, setGrants] = useState<Record<string, FluxPermissionScope>>(() => Object.fromEntries(
    permissions
      .filter((permission) => permission.role === role.id)
      .map((permission) => [String(permission.api_operation), permission.scope]),
  ) as Record<string, FluxPermissionScope>)
  const resourcesWithOperations = resources.filter((resource) => operations.some((operation) => operation.resource === resource.id))

  const toggleGrant = (operationId: number, checked: boolean) => {
    setGrants((current) => {
      const next = { ...current }
      if (checked) next[String(operationId)] = "all"
      else delete next[String(operationId)]
      return next
    })
  }

  const updateScope = (operationId: number, scope: FluxPermissionScope) => {
    setGrants((current) => ({ ...current, [String(operationId)]: scope }))
  }

  const save = () => {
    setNotice(null)
    startTransition(async () => {
      const result = await syncRolePermissions({
        projectId,
        roleId: role.id,
        grants: Object.entries(grants).map(([apiOperationId, scope]) => ({
          apiOperationId: Number(apiOperationId),
          scope,
        })),
      })
      if ("error" in result) {
        const progress = "data" in result && result.data
          ? " " + result.data.created + " skapade, " + result.data.updated + " ändrade och " + result.data.removed + " borttagna före felet."
          : ""
        setNotice(result.error + progress)
        return
      }

      setNotice(result.data.created + " skapade, " + result.data.updated + " ändrade och " + result.data.removed + " borttagna behörigheter.")
      router.refresh()
    })
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); save() }} className="border-y border-border">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border py-5 sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-text-faint">API-åtkomst</p>
          <h2 className="mt-1 text-xl font-semibold text-text">Behörighetsmatris för {role.name}</h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">Varje vald operation blir en RolePermission med ett explicit scope.</p>
        </div>
        <Button type="submit" variant="primary" size="sm" disabled={pending} className="min-h-10 w-full justify-center sm:w-auto">
          {pending ? "Sparar åtkomst..." : "Spara åtkomst"}
        </Button>
      </header>

      <ul className="divide-y divide-border">
        {resourcesWithOperations.map((resource) => {
          const resourceOperations = operations.filter((operation) => operation.resource === resource.id)
          return (
            <li key={resource.id} className="py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="font-mono font-semibold text-text">{resource.path}</p>
                <span className="text-xs text-text-faint">{resourceOperations.length} operationer</span>
              </div>
              <ul className="mt-3 divide-y divide-border border-l border-border">
                {resourceOperations.map((operation) => {
                  const scope = grants[String(operation.id)]
                  return (
                    <li key={operation.id} className="grid gap-3 py-3 pl-4 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-end">
                      <Checkbox
                        label={operation.key + " · " + operation.method + " " + operation.path}
                        checked={Boolean(scope)}
                        onChange={(event) => toggleGrant(operation.id, event.target.checked)}
                      />
                      <Field label="Scope">
                        <select className={fieldInputClass} disabled={!scope} value={scope ?? "all"} onChange={(event) => updateScope(operation.id, event.target.value as FluxPermissionScope)}>
                          {(Object.keys(scopeLabels) as FluxPermissionScope[]).map((value) => <option key={value} value={value}>{scopeLabels[value]}</option>)}
                        </select>
                      </Field>
                    </li>
                  )
                })}
                {resourceOperations.length === 0 && <li className="py-3 pl-4 text-sm text-text-muted">Resource saknar API-operationer.</li>}
              </ul>
            </li>
          )
        })}
        {resourcesWithOperations.length === 0 && <li className="py-4 text-sm text-text-muted">Skapa API-operationer innan du anger åtkomst.</li>}
      </ul>

      {notice && <p role="status" className="border-t border-border py-3 text-sm text-text-muted">{notice}</p>}
      <div className="flex justify-end border-t border-border py-4">
        <Button type="submit" variant="primary" size="sm" disabled={pending} className="min-h-10 w-full justify-center sm:w-auto">
          {pending ? "Sparar åtkomst..." : "Spara åtkomst"}
        </Button>
      </div>
    </form>
  )
}
