import { describe, expect, it } from "vitest"
import mermaid from "mermaid"
import { graphToMermaid, mermaidToGraph, type FlowGraph } from "./flow-mermaid"

describe("flowchart Mermaid conversion", () => {
  it("round-trips the editable graph, including layout and labels", async () => {
    const graph: FlowGraph = {
      nodes: [
        { id: "start", type: "shape", position: { x: 24, y: 36 }, data: { label: "Start", shape: "terminal" } },
        { id: "decision", type: "shape", position: { x: 220, y: 36 }, data: { label: "Redo?", shape: "decision" } },
      ],
      edges: [{ id: "start-decision", source: "start", target: "decision", type: "labeled", label: "Ja" }],
    }

    const source = graphToMermaid(graph)
    expect(mermaidToGraph(source)).toEqual(graph)
    await expect(mermaid.parse(source)).resolves.toMatchObject({ diagramType: expect.stringContaining("flowchart") })
  })

  it("reads a simple Mermaid flowchart without embedded editor data", () => {
    const graph = mermaidToGraph('flowchart TD\n  start(["Start"]) -->|"Ja"| slut(["Slut"])')

    expect(graph.nodes).toHaveLength(2)
    expect(graph.edges).toMatchObject([{ source: "start", target: "slut", label: "Ja" }])
  })
})
