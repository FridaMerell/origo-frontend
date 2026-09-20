"use client"

import { useState } from "react"
import { PencilIcon, PlusIcon } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { DeleteButton } from "@/app/components/ui/DeleteButton"
import { AppLink as Link } from "@/app/components/ui/AppLink"
import { deleteResource } from "@/app/actions/flux/design"
import type { FluxEntity, FluxResource } from "@/app/lib/dal"
import { useModel } from "./model-context"
import { OPERATION_LABELS, ResourceFormDrawer } from "./resource-form-drawer"

export function ResourcesView({ initialResources }: { initialResources: FluxResource[] }) {
  const { entities, fields } = useModel()
  const [resources, setResources] = useState(initialResources)
  const [editing, setEditing] = useState<FluxEntity | null>(null)

  const resourceOf = (entityId: number) => resources.find((item) => item.entity === entityId)
  const editingResource = editing ? resourceOf(editing.id) : undefined

  const removeResource = async (resource: FluxResource) => {
    setResources((prev) => prev.filter((item) => item.id !== resource.id))
    const result = await deleteResource(resource.id)
    if (result?.error) setResources((prev) => [...prev, resource])
  }

  if (entities.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-text-muted">
        <Link href="/model" className="underline">Skapa entiteter</Link> först. Varje entitet kan sedan få en API-resurs.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-muted">
        En resurs beskriver hur en entitet exponeras i API:t. Den styr genererade viewsets, klienter och controllers.
      </p>
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {entities.map((entity) => {
          const resource = resourceOf(entity.id)
          return (
            <li key={entity.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 text-sm">
                <span className="font-medium text-text">{entity.name}</span>
                {resource ? (
                  <>
                    <span className="ml-2 font-mono text-xs text-text-muted">/{resource.path}/</span>
                    <p className="mt-1 text-xs text-text-faint">
                      {resource.operations.map((operation) => OPERATION_LABELS[operation]).join(", ") || "Inga operationer"}
                      {resource.filters.length > 0 && ` · filter: ${resource.filters.join(", ")}`}
                      {resource.ordering && ` · sortering: ${resource.ordering}`}
                    </p>
                  </>
                ) : (
                  <span className="ml-2 text-xs text-text-faint">Ingen resurs</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {resource ? (
                  <>
                    <button
                      type="button"
                      aria-label="Redigera resurs"
                      className="rounded-md p-1 text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
                      onClick={() => setEditing(entity)}
                    >
                      <PencilIcon size={14} />
                    </button>
                    <DeleteButton
                      label="Ta bort resurs"
                      confirmTitle="Ta bort resurs"
                      confirmMessage="Ta bort resursen? Behörigheter som hör till den tas också bort."
                      showTitle
                      className="rounded-md p-1 text-text-faint transition-colors hover:bg-danger-wash hover:text-danger disabled:opacity-50"
                      onDelete={() => removeResource(resource)}
                    />
                  </>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setEditing(entity)}>
                    <PlusIcon size={14} />
                    Skapa resurs
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {editing && (
        <ResourceFormDrawer
          open
          onClose={() => setEditing(null)}
          entity={editing}
          fields={fields.filter((field) => field.entity === editing.id)}
          resource={editingResource}
          onSaved={(saved) =>
            setResources((prev) => (prev.some((item) => item.id === saved.id) ? prev.map((item) => (item.id === saved.id ? saved : item)) : [...prev, saved]))
          }
        />
      )}
    </div>
  )
}
