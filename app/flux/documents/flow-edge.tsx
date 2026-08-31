"use client"

import { useContext, useLayoutEffect, useRef, useState } from "react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getSmoothStepPath,
  useReactFlow,
} from "@xyflow/react"
import { FlowEditableContext } from "./flow-node"

export function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  label,
  selected,
}: EdgeProps) {
  const editable = useContext(FlowEditableContext)
  const { setEdges } = useReactFlow()
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })
  const text = typeof label === "string" ? label : ""

  useLayoutEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const setLabel = (next: string) => {
    setEdges((edges) => edges.map((edge) => edge.id === id ? { ...edge, label: next.trim() || undefined } : edge))
  }
  const remove = () => setEdges((edges) => edges.filter((edge) => edge.id !== id))

  const chip = "rounded bg-surface px-1.5 py-0.5 text-[11px] leading-none text-text-muted shadow-sm"

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={{ stroke: "var(--link)", strokeWidth: 1.5, ...style }} />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: "all" }}
        >
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                ref={inputRef}
                defaultValue={text}
                className="w-24 rounded border border-field-border bg-surface px-1 py-0.5 text-center text-[11px] text-text"
                onBlur={(event) => { setLabel(event.target.value); setEditing(false) }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") { setLabel((event.target as HTMLInputElement).value); setEditing(false) }
                  if (event.key === "Escape") setEditing(false)
                }}
              />
              {["Ja", "Nej"].map((quick) => (
                <button key={quick} type="button" className={chip} onMouseDown={(event) => { event.preventDefault(); setLabel(quick); setEditing(false) }}>
                  {quick}
                </button>
              ))}
            </div>
          ) : editable ? (
            <div className="flex items-center gap-1">
              <button type="button" className={`${chip} border border-border`} onClick={() => setEditing(true)}>
                {text || "+ text"}
              </button>
              {selected && (
                <button type="button" aria-label="Ta bort pil" className={`${chip} border border-border hover:text-danger`} onClick={remove}>
                  ✕
                </button>
              )}
            </div>
          ) : text ? (
            <span className={chip}>{text}</span>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export const flowEdgeTypes = { labeled: LabeledEdge }
