"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { Button } from "@/app/components/ui/Button"
import { Icon } from "@/app/components/ui/Icon"
import {
  CARDINALITY_LABELS,
  type DbFieldKey,
  type DbSchema,
  type DbTable,
  mermaidToSchema,
  type RelCardinality,
  schemaToMermaid,
  starterSchema,
} from "./db-mermaid"
import { MermaidDiagram } from "./mermaid-diagram"

const KEY_OPTIONS: DbFieldKey[] = ["", "PK", "FK", "UK"]
const inputClass = "rounded border border-field-border bg-surface px-2 py-1 text-sm text-text"

export function DbSchemaEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [schema, setSchema] = useState<DbSchema>(() => {
    const parsed = mermaidToSchema(value)
    return parsed.tables.length ? parsed : starterSchema()
  })

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const commit = useCallback((next: DbSchema) => {
    setSchema(next)
    onChangeRef.current(schemaToMermaid(next))
  }, [])

  const preview = useMemo(() => schemaToMermaid(schema), [schema])

  const patchTable = (index: number, patch: Partial<DbTable>) =>
    commit({ ...schema, tables: schema.tables.map((table, idx) => idx === index ? { ...table, ...patch } : table) })

  const renameTable = (index: number, name: string) => {
    const old = schema.tables[index].name
    commit({
      ...schema,
      tables: schema.tables.map((table, idx) => idx === index ? { ...table, name } : table),
      relations: schema.relations.map((relation) => ({
        ...relation,
        from: relation.from === old ? name : relation.from,
        to: relation.to === old ? name : relation.to,
      })),
    })
  }

  const addTable = () =>
    commit({ ...schema, tables: [...schema.tables, { name: `tabell${schema.tables.length + 1}`, fields: [] }] })

  const removeTable = (index: number) => {
    const name = schema.tables[index].name
    commit({
      ...schema,
      tables: schema.tables.filter((_, idx) => idx !== index),
      relations: schema.relations.filter((relation) => relation.from !== name && relation.to !== name),
    })
  }

  const patchField = (ti: number, fi: number, patch: Partial<{ name: string; type: string; key: DbFieldKey }>) =>
    patchTable(ti, { fields: schema.tables[ti].fields.map((field, idx) => idx === fi ? { ...field, ...patch } : field) })

  const addField = (ti: number) =>
    patchTable(ti, { fields: [...schema.tables[ti].fields, { name: "fält", type: "text", key: "" }] })

  const removeField = (ti: number, fi: number) =>
    patchTable(ti, { fields: schema.tables[ti].fields.filter((_, idx) => idx !== fi) })

  const patchRelation = (index: number, patch: Partial<{ from: string; to: string; cardinality: RelCardinality; label: string }>) =>
    commit({ ...schema, relations: schema.relations.map((relation, idx) => idx === index ? { ...relation, ...patch } : relation) })

  const addRelation = () => {
    const names = schema.tables.map((table) => table.name)
    commit({
      ...schema,
      relations: [...schema.relations, {
        id: `r${Date.now().toString(36)}`,
        from: names[0] ?? "",
        to: names[1] ?? names[0] ?? "",
        cardinality: "one-many",
        label: "",
      }],
    })
  }

  const removeRelation = (index: number) =>
    commit({ ...schema, relations: schema.relations.filter((_, idx) => idx !== index) })

  const tableNames = schema.tables.map((table) => table.name)

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        {schema.tables.map((table, ti) => (
          <div key={ti} className="rounded-lg border border-border bg-surface">
            <div className="flex items-center gap-2 border-b border-border px-2 py-1.5">
              <Icon name="table" size={14} className="text-text-muted" />
              <input
                className={`${inputClass} flex-1 font-semibold`}
                value={table.name}
                onChange={(event) => renameTable(ti, event.target.value)}
                aria-label="Tabellnamn"
              />
              <button type="button" onClick={() => removeTable(ti)} className="rounded p-1 text-text-muted hover:text-danger" aria-label="Ta bort tabell">
                <Icon name="trash-2" size={14} />
              </button>
            </div>
            <div className="flex flex-col gap-1.5 p-2">
              {table.fields.map((field, fi) => (
                <div key={fi} className="flex items-center gap-1.5">
                  <input className={`${inputClass} flex-1`} value={field.name} placeholder="fält" onChange={(event) => patchField(ti, fi, { name: event.target.value })} aria-label="Fältnamn" />
                  <input className={`${inputClass} w-24`} value={field.type} placeholder="typ" onChange={(event) => patchField(ti, fi, { type: event.target.value })} aria-label="Fälttyp" />
                  <select className={`${inputClass} w-20`} value={field.key} onChange={(event) => patchField(ti, fi, { key: event.target.value as DbFieldKey })} aria-label="Nyckel">
                    {KEY_OPTIONS.map((key) => <option key={key} value={key}>{key || "—"}</option>)}
                  </select>
                  <button type="button" onClick={() => removeField(ti, fi)} className="rounded p-1 text-text-muted hover:text-danger" aria-label="Ta bort fält">
                    <Icon name="x" size={13} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => addField(ti)} className="self-start rounded px-1.5 py-0.5 text-xs text-link hover:underline">
                + Fält
              </button>
            </div>
          </div>
        ))}

        <Button type="button" variant="secondary" size="sm" onClick={addTable} className="self-start">
          <Icon name="plus" size={14} /> Tabell
        </Button>

        {schema.tables.length >= 2 && (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-faint">Relationer</span>
            {schema.relations.map((relation, ri) => (
              <div key={relation.id} className="flex flex-wrap items-center gap-1.5">
                <select className={`${inputClass} flex-1`} value={relation.from} onChange={(event) => patchRelation(ri, { from: event.target.value })} aria-label="Från tabell">
                  {tableNames.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <select className={`${inputClass} w-24`} value={relation.cardinality} onChange={(event) => patchRelation(ri, { cardinality: event.target.value as RelCardinality })} aria-label="Kardinalitet">
                  {(Object.keys(CARDINALITY_LABELS) as RelCardinality[]).map((card) => <option key={card} value={card}>{CARDINALITY_LABELS[card]}</option>)}
                </select>
                <select className={`${inputClass} flex-1`} value={relation.to} onChange={(event) => patchRelation(ri, { to: event.target.value })} aria-label="Till tabell">
                  {tableNames.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <input className={`${inputClass} w-28`} value={relation.label} placeholder="etikett" onChange={(event) => patchRelation(ri, { label: event.target.value })} aria-label="Relationsetikett" />
                <button type="button" onClick={() => removeRelation(ri)} className="rounded p-1 text-text-muted hover:text-danger" aria-label="Ta bort relation">
                  <Icon name="x" size={13} />
                </button>
              </div>
            ))}
            <button type="button" onClick={addRelation} className="self-start rounded px-1.5 py-0.5 text-xs text-link hover:underline">
              + Relation
            </button>
          </div>
        )}
      </div>

      <div className="min-h-[200px] overflow-auto rounded-lg border border-border bg-surface-2 p-3">
        <MermaidDiagram chart={preview} />
      </div>
    </div>
  )
}
