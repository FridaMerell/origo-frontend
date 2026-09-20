"use client"

import { useMemo, useState } from "react"
import { PencilIcon, PlusIcon } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { DeleteButton } from "@/app/components/ui/DeleteButton"
import { deleteEntity, deleteField, deleteRelation } from "@/app/actions/flux/datamodel"
import type { FluxEntity, FluxField, FluxRelation } from "@/app/lib/dal"
import { EntityFormDrawer } from "./entity-form-drawer"
import { FieldFormDrawer } from "./field-form-drawer"
import { useModel } from "./model-context"
import { RELATION_KIND_LABELS, RelationFormDrawer } from "./relation-form-drawer"

const deleteClass = "rounded-md p-1 text-text-faint transition-colors hover:bg-danger-wash hover:text-danger disabled:opacity-50"
const editClass = "rounded-md p-1 text-text-faint transition-colors hover:bg-surface-2 hover:text-text"

function upsert<T extends { id: number }>(items: T[], item: T): T[] {
  return items.some((existing) => existing.id === item.id)
    ? items.map((existing) => (existing.id === item.id ? item : existing))
    : [...items, item]
}

export function ModelView() {
  const { projectId, entities, fields, relations, setEntities, setFields, setRelations } = useModel()
  const [selectedId, setSelectedId] = useState<number | null>(entities[0]?.id ?? null)

  const [entityDrawer, setEntityDrawer] = useState<{ open: boolean; entity?: FluxEntity }>({ open: false })
  const [fieldDrawer, setFieldDrawer] = useState<{ open: boolean; field?: FluxField }>({ open: false })
  const [relationDrawer, setRelationDrawer] = useState<{ open: boolean; relation?: FluxRelation }>({ open: false })

  const selected = entities.find((entity) => entity.id === selectedId) ?? null
  const entityName = (id: number) => entities.find((entity) => entity.id === id)?.name ?? "?"

  const selectedFields = useMemo(
    () => fields.filter((field) => field.entity === selectedId).sort((a, b) => a.order - b.order || a.id - b.id),
    [fields, selectedId],
  )
  const selectedRelations = useMemo(
    () => relations.filter((relation) => relation.source === selectedId || relation.target === selectedId),
    [relations, selectedId],
  )

  const removeEntity = async (entity: FluxEntity) => {
    const snapshot = { entities, fields, relations, selectedId }
    setEntities((prev) => prev.filter((item) => item.id !== entity.id))
    setFields((prev) => prev.filter((item) => item.entity !== entity.id))
    setRelations((prev) => prev.filter((item) => item.source !== entity.id && item.target !== entity.id))
    setSelectedId((prev) => (prev === entity.id ? entities.find((item) => item.id !== entity.id)?.id ?? null : prev))
    const result = await deleteEntity(entity.id)
    if (result?.error) {
      setEntities(snapshot.entities)
      setFields(snapshot.fields)
      setRelations(snapshot.relations)
      setSelectedId(snapshot.selectedId)
    }
  }

  const removeField = async (field: FluxField) => {
    setFields((prev) => prev.filter((item) => item.id !== field.id))
    const result = await deleteField(field.id)
    if (result?.error) setFields((prev) => upsert(prev, field))
  }

  const removeRelation = async (relation: FluxRelation) => {
    setRelations((prev) => prev.filter((item) => item.id !== relation.id))
    const result = await deleteRelation(relation.id)
    if (result?.error) setRelations((prev) => upsert(prev, relation))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={() => setEntityDrawer({ open: true })}>
          <PlusIcon size={14} />
          Ny entitet
        </Button>
      </div>

      {entities.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-text-muted">
          Projektet har inga entiteter än. Skapa den första för att börja beskriva datamodellen.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <ul className="flex flex-col gap-1 self-start">
            {entities.map((entity) => (
              <li key={entity.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(entity.id)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    entity.id === selectedId ? "bg-surface-2 font-medium text-text" : "text-text-muted hover:bg-surface-2/60"
                  }`}
                >
                  <span className="truncate">{entity.name}</span>
                  <span className="text-xs text-text-faint">{fields.filter((field) => field.entity === entity.id).length}</span>
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            <div className="flex min-w-0 flex-col gap-6">
              <section className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-medium text-text">{selected.name}</h2>
                    {selected.description && <p className="mt-1 text-sm text-text-muted">{selected.description}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" aria-label="Redigera entitet" className={editClass} onClick={() => setEntityDrawer({ open: true, entity: selected })}>
                      <PencilIcon size={14} />
                    </button>
                    <DeleteButton
                      label="Ta bort entitet"
                      confirmTitle="Ta bort entitet"
                      confirmMessage="Ta bort entiteten? Dess fält och relationer tas också bort och går inte att återställa."
                      showTitle
                      stopPropagation
                      className={deleteClass}
                      onDelete={() => removeEntity(selected)}
                    />
                  </div>
                </div>
              </section>

              <section className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-text-faint">Fält</h3>
                  <Button variant="secondary" size="sm" onClick={() => setFieldDrawer({ open: true })}>
                    <PlusIcon size={14} />
                    Nytt fält
                  </Button>
                </div>
                {selectedFields.length === 0 ? (
                  <p className="text-sm text-text-muted">Inga fält än. Ett id läggs till automatiskt.</p>
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
                    {selectedFields.map((field) => (
                      <li key={field.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <div className="min-w-0 text-sm">
                          <span className="font-medium text-text">{field.name}</span>
                          <span className="ml-2 text-text-muted">{field.type}{field.max_length ? `(${field.max_length})` : ""}</span>
                          {field.unique && <span className="ml-2 text-xs text-text-faint">unikt</span>}
                          {field.nullable && <span className="ml-2 text-xs text-text-faint">null</span>}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button type="button" aria-label="Redigera fält" className={editClass} onClick={() => setFieldDrawer({ open: true, field })}>
                            <PencilIcon size={14} />
                          </button>
                          <DeleteButton
                            label="Ta bort fält"
                            confirmTitle="Ta bort fält"
                            confirmMessage="Ta bort fältet? Det går inte att återställa."
                            showTitle
                            stopPropagation
                            className={deleteClass}
                            onDelete={() => removeField(field)}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-text-faint">Relationer</h3>
                  <Button variant="secondary" size="sm" disabled={entities.length < 2} onClick={() => setRelationDrawer({ open: true })}>
                    <PlusIcon size={14} />
                    Ny relation
                  </Button>
                </div>
                {selectedRelations.length === 0 ? (
                  <p className="text-sm text-text-muted">
                    {entities.length < 2 ? "Skapa minst två entiteter för att kunna relatera dem." : "Inga relationer än."}
                  </p>
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
                    {selectedRelations.map((relation) => (
                      <li key={relation.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <div className="min-w-0 text-sm">
                          <span className="font-medium text-text">{relation.name}</span>
                          <span className="ml-2 text-text-muted">
                            {entityName(relation.source)} → {entityName(relation.target)}
                          </span>
                          <span className="ml-2 text-xs text-text-faint">{RELATION_KIND_LABELS[relation.kind]}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button type="button" aria-label="Redigera relation" className={editClass} onClick={() => setRelationDrawer({ open: true, relation })}>
                            <PencilIcon size={14} />
                          </button>
                          <DeleteButton
                            label="Ta bort relation"
                            confirmTitle="Ta bort relation"
                            confirmMessage="Ta bort relationen? Det går inte att återställa."
                            showTitle
                            stopPropagation
                            className={deleteClass}
                            onDelete={() => removeRelation(relation)}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>
      )}

      <EntityFormDrawer
        open={entityDrawer.open}
        onClose={() => setEntityDrawer({ open: false })}
        projectId={projectId}
        entity={entityDrawer.entity}
        onSaved={(entity) => {
          setEntities((prev) => upsert(prev, entity).sort((a, b) => a.name.localeCompare(b.name)))
          setSelectedId(entity.id)
        }}
      />
      {selected && (
        <FieldFormDrawer
          open={fieldDrawer.open}
          onClose={() => setFieldDrawer({ open: false })}
          entityId={selected.id}
          nextOrder={selectedFields.length ? selectedFields[selectedFields.length - 1].order + 1 : 0}
          field={fieldDrawer.field}
          onSaved={(field) => setFields((prev) => upsert(prev, field))}
        />
      )}
      {selected && (
        <RelationFormDrawer
          open={relationDrawer.open}
          onClose={() => setRelationDrawer({ open: false })}
          sourceId={selected.id}
          entities={entities}
          relation={relationDrawer.relation}
          onSaved={(relation) => setRelations((prev) => upsert(prev, relation))}
        />
      )}
    </div>
  )
}
