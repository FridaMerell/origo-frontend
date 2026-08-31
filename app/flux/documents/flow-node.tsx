"use client"

import { createContext, type CSSProperties, useContext, useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  Handle,
  type NodeProps,
  NodeResizer,
  NodeToolbar,
  type NodeTypes,
  Position,
  useReactFlow,
} from "@xyflow/react"
import type { NodeShape } from "./flow-mermaid"

/** Whether the surrounding flow is editable (true in the editor, false in previews). */
export const FlowEditableContext = createContext(false)

const SHAPE_LABELS: Record<NodeShape, string> = {
  process: "Process",
  decision: "Beslut",
  terminal: "Start/slut",
}

function shapeStyle(shape: NodeShape): CSSProperties {
  const base: CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontSize: 12,
    lineHeight: 1.35,
    color: "var(--text)",
    background: "var(--surface)",
    border: "1px solid var(--border-strong)",
    boxSizing: "border-box",
  }
  if (shape === "decision") {
    return { ...base, padding: "10px 28px", background: "var(--accent-wash)", clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }
  }
  if (shape === "terminal") return { ...base, padding: "8px 16px", borderRadius: 999 }
  return { ...base, padding: "8px 12px", borderRadius: 6 }
}

const HANDLE_STYLE: CSSProperties = { width: 8, height: 8, background: "var(--accent)", border: "none" }

export function ShapeNode({ id, data, selected }: NodeProps) {
  const editable = useContext(FlowEditableContext)
  const { setNodes, setEdges } = useReactFlow()
  const shape = (data?.shape as NodeShape) ?? "process"
  const label = data && typeof data.label === "string" ? data.label : ""

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(label)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!editing) setDraft(label)
  }, [label, editing])

  useLayoutEffect(() => {
    if (editing) {
      const el = textareaRef.current
      el?.focus()
      el?.setSelectionRange(el.value.length, el.value.length)
    }
  }, [editing])

  const commit = (next: string) => {
    setNodes((nodes) => nodes.map((node) => node.id === id ? { ...node, data: { ...node.data, label: next } } : node))
  }

  const setShape = (next: NodeShape) => {
    setNodes((nodes) => nodes.map((node) => node.id === id ? { ...node, data: { ...node.data, shape: next } } : node))
  }

  const remove = () => {
    setNodes((nodes) => nodes.filter((node) => node.id !== id))
    setEdges((edges) => edges.filter((edge) => edge.source !== id && edge.target !== id))
  }

  return (
    <>
      {editable && (
        <>
          <NodeResizer isVisible={Boolean(selected)} minWidth={80} minHeight={44} color="var(--accent)" />
          <NodeToolbar isVisible={Boolean(selected)} position={Position.Top} className="flex items-center gap-1 rounded-md border border-border bg-surface px-1.5 py-1 shadow-sm">
            {(Object.keys(SHAPE_LABELS) as NodeShape[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setShape(option)}
                className={`rounded px-1.5 py-0.5 text-xs ${shape === option ? "bg-accent-wash text-text" : "text-text-muted hover:bg-surface-2"}`}
              >
                {SHAPE_LABELS[option]}
              </button>
            ))}
            <span className="mx-0.5 h-4 w-px bg-border" />
            <button type="button" onClick={remove} aria-label="Ta bort ruta" className="rounded px-1 py-0.5 text-xs text-text-muted hover:text-danger">
              Ta bort
            </button>
          </NodeToolbar>
        </>
      )}

      <Handle id="t" type="source" position={Position.Top} style={HANDLE_STYLE} />
      <Handle id="l" type="source" position={Position.Left} style={HANDLE_STYLE} />
      <Handle id="r" type="source" position={Position.Right} style={HANDLE_STYLE} />
      <Handle id="b" type="source" position={Position.Bottom} style={HANDLE_STYLE} />

      <div
        style={shapeStyle(shape)}
        onDoubleClick={editable ? () => { setDraft(label); setEditing(true) } : undefined}
      >
        {editing ? (
          <textarea
            ref={textareaRef}
            className="nodrag nowheel h-full w-full resize-none border-none bg-transparent text-center text-xs leading-tight text-text outline-none"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => { commit(draft); setEditing(false) }}
            onKeyDown={(event) => {
              if (event.key === "Escape") { setEditing(false); setDraft(label) }
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { commit(draft); setEditing(false) }
            }}
          />
        ) : (
          label || <span className="text-text-faint">Dubbelklicka för text</span>
        )}
      </div>
    </>
  )
}

export const flowNodeTypes: NodeTypes = { shape: ShapeNode }
