"use client"

import { useState } from "react"
import { Field, fieldInputClass } from "@/app/components/form/Field"

type JsonKind = "object" | "array" | "string" | "number" | "boolean" | "null"
type JsonNode = { id: string; key: string; kind: JsonKind; value?: string; children?: JsonNode[] }
type JsonTemplate = { label: string; key: string; value: unknown }

const objectTemplates: JsonTemplate[] = [
  { label: "Textfält", key: "text", value: "" },
  { label: "Tal", key: "number", value: 0 },
  { label: "Ja/nej", key: "enabled", value: false },
  { label: "Objekt", key: "object", value: {} },
  { label: "Lista", key: "items", value: [] },
]

const arrayTemplates: JsonTemplate[] = [
  { label: "Textvärde", key: "", value: "" },
  { label: "Talvärde", key: "", value: 0 },
  { label: "Objekt", key: "", value: {} },
  { label: "Lista", key: "", value: [] },
]

let sequence = 0

function nodeId() {
  sequence += 1
  return "json-node-" + sequence
}

function toNode(value: unknown, key = ""): JsonNode {
  if (Array.isArray(value)) return { id: nodeId(), key, kind: "array", children: value.map((item) => toNode(item)) }
  if (value && typeof value === "object") return { id: nodeId(), key, kind: "object", children: Object.entries(value as Record<string, unknown>).map(([childKey, child]) => toNode(child, childKey)) }
  if (value === null) return { id: nodeId(), key, kind: "null" }
  if (typeof value === "number") return { id: nodeId(), key, kind: "number", value: String(value) }
  if (typeof value === "boolean") return { id: nodeId(), key, kind: "boolean", value: String(value) }
  return { id: nodeId(), key, kind: "string", value: value === undefined ? "" : String(value) }
}

function toValue(node: JsonNode): unknown {
  if (node.kind === "object") return Object.fromEntries((node.children ?? []).filter((child) => child.key.trim()).map((child) => [child.key.trim(), toValue(child)]))
  if (node.kind === "array") return (node.children ?? []).map(toValue)
  if (node.kind === "number") return Number(node.value || 0)
  if (node.kind === "boolean") return node.value !== "false"
  if (node.kind === "null") return null
  return node.value ?? ""
}

function updateNode(node: JsonNode, target: string, transform: (current: JsonNode) => JsonNode): JsonNode {
  if (node.id === target) return transform(node)
  if (!node.children) return node
  return { ...node, children: node.children.map((child) => updateNode(child, target, transform)) }
}

function removeNode(node: JsonNode, target: string): JsonNode {
  if (!node.children) return node
  return { ...node, children: node.children.filter((child) => child.id !== target).map((child) => removeNode(child, target)) }
}

function nextKey(node: JsonNode, preferred: string) {
  const existing = new Set((node.children ?? []).map((child) => child.key))
  if (!existing.has(preferred)) return preferred

  let index = 2
  while (existing.has(preferred + "_" + index)) index += 1
  return preferred + "_" + index
}

function appendChild(node: JsonNode, target: string, template?: JsonTemplate): JsonNode {
  if (node.id === target) {
    const value = template?.value ?? ""
    const key = node.kind === "object" ? nextKey(node, template?.key || "field") : ""
    return { ...node, children: [...(node.children ?? []), toNode(value, key)] }
  }
  if (!node.children) return node
  return { ...node, children: node.children.map((child) => appendChild(child, target, template)) }
}

function templatesFor(label: string, kind: "object" | "array"): JsonTemplate[] {
  const normalized = label.toLocaleLowerCase("sv-SE")

  if (kind === "array" && normalized.includes("parametrar")) {
    return [{ label: "Query-parameter", key: "", value: { name: "", in: "query", type: "string", required: false, description: "" } }]
  }
  if (kind === "array" && normalized.includes("filter")) {
    return [{ label: "Filterregel", key: "", value: { path: "", op: "eq", value: "" } }]
  }
  if (kind === "array" && normalized.includes("mappning")) {
    return [{ label: "Fältmappning", key: "", value: { path: "", field: "" } }]
  }
  if (kind === "array" && normalized.includes("många-till-många")) {
    return [{ label: "Relationens ID", key: "", value: 0 }]
  }
  if (kind === "object" && (normalized.includes("schema") || normalized.includes("request"))) {
    return [
      { label: "Textfält", key: "field", value: { type: "string" } },
      { label: "Talfält", key: "number", value: { type: "number" } },
      { label: "Ja/nej", key: "enabled", value: { type: "boolean" } },
      { label: "Objekt", key: "object", value: { type: "object", properties: {} } },
      { label: "Lista", key: "items", value: { type: "array", items: {} } },
    ]
  }
  if (kind === "object" && normalized.includes("paginering")) {
    return [
      { label: "Limit", key: "limit", value: 100 },
      { label: "Offset", key: "offset", value: 0 },
      { label: "Sida", key: "page", value: 1 },
      { label: "Cursor", key: "cursor", value: "" },
    ]
  }

  return kind === "object" ? objectTemplates : arrayTemplates
}

function valueInput(node: JsonNode, onUpdate: (transform: (current: JsonNode) => JsonNode) => void) {
  if (node.kind === "boolean") {
    return (
      <Field label="Innehåll">
        <select className={fieldInputClass} value={node.value ?? "true"} onChange={(event) => onUpdate((current) => ({ ...current, value: event.target.value }))}>
          <option value="true">Ja</option>
          <option value="false">Nej</option>
        </select>
      </Field>
    )
  }
  if (node.kind === "null") return <p className="pb-2 text-sm text-text-faint">Tomt värde</p>
  if (node.kind === "object" || node.kind === "array") return <p className="pb-2 text-sm text-text-faint">Bygg innehållet nedan.</p>

  return (
    <Field label="Innehåll">
      <input
        type={node.kind === "number" ? "number" : "text"}
        className={fieldInputClass}
        value={node.value ?? ""}
        onChange={(event) => onUpdate((current) => ({ ...current, value: event.target.value }))}
      />
    </Field>
  )
}

function NodeEditor({
  node,
  parentKind,
  isRoot,
  rootTemplates,
  onUpdate,
  onRemove,
  onAppend,
}: {
  node: JsonNode
  parentKind?: JsonKind
  isRoot?: boolean
  rootTemplates?: JsonTemplate[]
  onUpdate: (id: string, transform: (current: JsonNode) => JsonNode) => void
  onRemove: (id: string) => void
  onAppend: (id: string, template?: JsonTemplate) => void
}) {
  const container = node.kind === "object" || node.kind === "array"
  const arrayItem = parentKind === "array"
  const templates = isRoot && rootTemplates ? rootTemplates : node.kind === "object" ? objectTemplates : arrayTemplates
  const children = node.children ?? []

  const changeKind = (kind: JsonKind) => onUpdate(node.id, (current) => ({
    ...current,
    kind,
    value: kind === "boolean" ? "true" : kind === "number" ? "0" : kind === "string" ? current.value ?? "" : undefined,
    children: kind === "object" || kind === "array" ? current.children ?? [] : undefined,
  }))

  return (
    <div className={isRoot ? "" : "border-t border-border pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0"}>
      {!isRoot && (
        <div className={arrayItem ? "grid gap-3 py-2 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-end" : "grid gap-3 py-2 sm:grid-cols-[minmax(8rem,.7fr)_8rem_minmax(0,1fr)_auto] sm:items-end"}>
          {!arrayItem && (
            <Field label="Fältnamn">
              <input className={fieldInputClass} value={node.key} onChange={(event) => onUpdate(node.id, (current) => ({ ...current, key: event.target.value }))} />
            </Field>
          )}
          <Field label="Datatyp">
            <select className={fieldInputClass} value={node.kind} onChange={(event) => changeKind(event.target.value as JsonKind)}>
              <option value="string">Text</option>
              <option value="number">Tal</option>
              <option value="boolean">Ja/nej</option>
              <option value="object">Objekt</option>
              <option value="array">Lista</option>
              <option value="null">Tomt värde</option>
            </select>
          </Field>
          {valueInput(node, (transform) => onUpdate(node.id, transform))}
          <button type="button" onClick={() => onRemove(node.id)} className="inline-flex min-h-10 items-center text-sm text-text-muted hover:text-danger sm:mb-0.5">
            Ta bort
          </button>
        </div>
      )}

      {container && (
        <div className={isRoot ? "" : "mt-3"}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-y border-border py-2">
            <p className="mr-1 text-xs font-medium text-text-muted">{node.kind === "object" ? "Fält" : "Rader"}: {children.length}</p>
            {templates.map((template) => (
              <button key={template.label} type="button" onClick={() => onAppend(node.id, template)} className="inline-flex min-h-9 items-center border-b border-transparent px-1 text-xs font-medium text-accent hover:border-accent">
                + {template.label}
              </button>
            ))}
            <button type="button" onClick={() => onAppend(node.id)} className="inline-flex min-h-9 items-center border-b border-transparent px-1 text-xs text-text-muted hover:border-text-muted">
              + Tom rad
            </button>
          </div>
          <div className={isRoot ? "divide-y divide-border" : "mt-1"}>
            {children.map((child) => (
              <NodeEditor
                key={child.id}
                node={child}
                parentKind={node.kind}
                onUpdate={onUpdate}
                onRemove={onRemove}
                onAppend={onAppend}
              />
            ))}
            {children.length === 0 && <p className="py-4 text-sm text-text-muted">Inga värden ännu. Välj en mall ovan eller lägg till en tom rad.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export function JsonTreeEditor({
  label,
  description,
  value,
  onChange,
  rootKind = "object",
}: {
  label: string
  description: string
  value: unknown
  onChange: (value: unknown) => void
  rootKind?: "object" | "array"
}) {
  const [root, setRoot] = useState<JsonNode>(() => value === null || value === undefined ? { id: nodeId(), key: "", kind: rootKind, children: [] } : toNode(value))

  const apply = (next: JsonNode) => {
    setRoot(next)
    onChange(toValue(next))
  }

  const rootTemplates = templatesFor(label, rootKind)

  return (
    <section className="border-y border-border py-5">
      <div>
        <h3 className="font-semibold text-text">{label}</h3>
        <p className="mt-1 text-xs leading-5 text-text-muted">{description}</p>
      </div>
      <div className="mt-4">
        <NodeEditor
          node={root}
          isRoot
          rootTemplates={rootTemplates}
          onUpdate={(id, transform) => apply(updateNode(root, id, transform))}
          onRemove={(id) => apply(removeNode(root, id))}
          onAppend={(id, template) => apply(appendChild(root, id, template))}
        />
      </div>
    </section>
  )
}
