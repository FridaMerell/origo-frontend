"use client"

import "@xyflow/react/dist/style.css"

import { useEffect, useMemo, useRef } from "react"
import {
  Background,
  ConnectionMode,
  Controls,
  type Edge,
  MarkerType,
  MiniMap,
  type Node,
  ReactFlow,
  ReactFlowProvider,
  useEdges,
  useNodes,
  useReactFlow,
} from "@xyflow/react"
import { Button } from "@/app/components/ui/Button"
import { Icon } from "@/app/components/ui/Icon"
import { flowEdgeTypes } from "./flow-edge"
import { FlowEditableContext, flowNodeTypes } from "./flow-node"
import { type FlowGraph, graphToMermaid, mermaidToGraph, type NodeShape } from "./flow-mermaid"

const DEFAULT_SIZE: Record<NodeShape, { width: number; height: number }> = {
  process: { width: 130, height: 52 },
  decision: { width: 150, height: 96 },
  terminal: { width: 120, height: 46 },
}

function normalise(graph: FlowGraph): FlowGraph {
  return {
    nodes: graph.nodes.map((node) => ({ ...node, type: node.type ?? "shape" })),
    edges: graph.edges.map((edge) => ({
      ...edge,
      type: edge.type ?? "labeled",
      markerEnd: edge.markerEnd ?? { type: MarkerType.ArrowClosed, color: "var(--link)" },
    })),
  }
}

/** The document stores Mermaid; strip the fields Mermaid can't express before
 *  re-generating so the round-trip is stable. */
function toMermaid(nodes: Node[], edges: Edge[]): string {
  return graphToMermaid({
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type ?? "shape",
      position: node.position,
      data: node.data,
      width: node.width,
      height: node.height,
    }) as Node),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? null,
      targetHandle: edge.targetHandle ?? null,
      type: edge.type ?? "labeled",
      label: typeof edge.label === "string" ? edge.label : undefined,
    }) as Edge),
  })
}

let counter = 0

function EditorInner({
  initial,
  value,
  onChange,
}: {
  initial: FlowGraph
  value: string
  onChange: (value: string) => void
}) {
  const rf = useReactFlow()
  const nodes = useNodes()
  const edges = useEdges()

  const lastSent = useRef(value)
  const hydrated = useRef(false)
  const pending = useRef<string | null>(null)
  useEffect(() => {
    const next = toMermaid(nodes, edges)
    if (next === lastSent.current) return
    // Wait until the store has caught up with the initial graph, then adopt that
    // normalised form as the baseline without marking the document dirty.
    if (!hydrated.current) {
      if (nodes.length < initial.nodes.length) return
      hydrated.current = true
      lastSent.current = next
      return
    }
    pending.current = next
    const timer = setTimeout(() => {
      if (pending.current == null) return
      lastSent.current = pending.current
      onChange(pending.current)
      pending.current = null
    }, 250)
    return () => clearTimeout(timer)
  }, [nodes, edges, onChange])
  useEffect(() => () => {
    if (pending.current != null) onChange(pending.current)
  }, [onChange])

  const addNode = (shape: NodeShape) => {
    counter += 1
    const size = DEFAULT_SIZE[shape]
    rf.addNodes({
      id: `n${Date.now().toString(36)}${counter}`,
      type: "shape",
      position: { x: 60 + (nodes.length % 4) * 210, y: 70 + Math.floor(nodes.length / 4) * 140 },
      data: { label: "", shape },
      width: size.width,
      height: size.height,
    })
  }

  return (
    <div className="overflow-hidden rounded border border-field-border bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <span className="mr-1 text-xs text-text-muted">Lägg till:</span>
        <Button type="button" variant="secondary" size="sm" onClick={() => addNode("process")}><Icon name="square" size={13} /> Process</Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => addNode("decision")}><Icon name="diamond" size={13} /> Beslut</Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => addNode("terminal")}><Icon name="circle" size={13} /> Start/slut</Button>
      </div>

      <div className="h-[460px] bg-surface-2">
        <FlowEditableContext.Provider value={true}>
          <ReactFlow
            defaultNodes={initial.nodes}
            defaultEdges={initial.edges}
            nodeTypes={flowNodeTypes}
            edgeTypes={flowEdgeTypes}
            connectionMode={ConnectionMode.Loose}
            defaultEdgeOptions={{ type: "labeled", markerEnd: { type: MarkerType.ArrowClosed, color: "var(--link)" } }}
            isValidConnection={(connection) =>
              connection.source !== connection.target &&
              !edges.some((edge) => edge.source === connection.source && edge.target === connection.target)
            }
            fitView
            fitViewOptions={{ padding: 0.2 }}
            zoomOnDoubleClick={false}
            deleteKeyCode={["Backspace", "Delete"]}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} size={1} />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </FlowEditableContext.Provider>
      </div>

      <p className="border-t border-border px-3 py-2 text-xs text-text-muted">
        Dubbelklicka en ruta för att skriva text (flera rader). Dra i hörnen för att ändra storlek, och i verktygsraden ovanför rutan för form.
        Dra mellan rutor för att koppla dem, dubbelklicka pilen för Ja/Nej.
      </p>
    </div>
  )
}

export function FlowchartEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const initial = useMemo(() => normalise(mermaidToGraph(value)), [value])
  return (
    <ReactFlowProvider>
      <EditorInner initial={initial} value={value} onChange={onChange} />
    </ReactFlowProvider>
  )
}
