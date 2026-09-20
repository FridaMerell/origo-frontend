"use client"

import { useEffect, useId, useRef, useState } from "react"

function readTheme(el: Element) {
  const s = getComputedStyle(el)
  const v = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback
  return {
    bg: v("--bg", "#1b1b2f"),
    surface: v("--surface", "#2a2a45"),
    surface2: v("--surface-2", "#333355"),
    border: v("--border", "#38385a"),
    borderStrong: v("--border-strong", "#4a4a73"),
    text: v("--text", "#ece9f5"),
    textMuted: v("--text-muted", "#c0bed2"),
    accent: v("--accent", "#A86B27"),
    accentWash: v("--accent-wash", "#F1E6D6"),
    line: v("--link", v("--secondary", "#4fd8e8")),
    font: v("--font-body", "inherit"),
  }
}

type Theme = ReturnType<typeof readTheme>

const ER_RADIUS = 10

/** Mermaid's ER renderer is generic and boxy; scope-style the output so it reads
 *  like a Flux surface — muted types, quiet dividers, bold entity name. */
function withErPolish(svg: string, id: string, t: Theme): string {
  const css = `
    #${id} .node .row-rect-odd { fill: ${t.surface}; stroke: ${t.border}; }
    #${id} .node .row-rect-even { fill: ${t.bg}; stroke: ${t.border}; }
    #${id} .node .divider { fill: ${t.border}; stroke: ${t.border}; opacity: .5; }
    #${id} .node .label.name, #${id} .node .label.name span { font-weight: 700; letter-spacing: .02em; }
    #${id} .node .attribute-type, #${id} .node .attribute-type span { fill: ${t.textMuted}; color: ${t.textMuted}; font-style: italic; }
    #${id} .node .attribute-keys, #${id} .node .attribute-keys span { fill: ${t.textMuted}; color: ${t.textMuted}; letter-spacing: .05em; }
    #${id} .relationshipLine { stroke: ${t.borderStrong}; }
    #${id} .node foreignObject,
    #${id} .node foreignObject > div,
    #${id} .node .label,
    #${id} .node .label span,
    #${id} .node text { overflow: visible !important; white-space: nowrap; }
  `
  return svg.replace(/(<svg[^>]*>)/, `$1<style>${css}</style>`)
}

function styleErLabels(root: SVGSVGElement, t: Theme) {
  const edges = Array.from(root.querySelectorAll<SVGGeometryElement>(".relationshipLine"))
  const labels = Array.from(root.querySelectorAll<SVGGElement>("g.edgeLabel"))

  labels.forEach((label, index) => {
    const edge = edges[index]
    if (edge) {
      const point = edge.getPointAtLength(edge.getTotalLength() / 2)
      label.setAttribute("transform", `translate(${point.x}, ${point.y})`)
    }

    const labelGroup = label.querySelector<SVGGElement>("g.label")
    const foreignObject = label.querySelector<SVGForeignObjectElement>("foreignObject")
    const background = label.querySelector<HTMLElement>("foreignObject .labelBkg")
    if (!labelGroup || !foreignObject || !background || label.dataset.styled) return

    label.dataset.styled = "1"
    const originalWidth = Number(foreignObject.getAttribute("width") ?? 0)
    const originalHeight = Number(foreignObject.getAttribute("height") ?? 0)
    const width = originalWidth + 16
    const height = originalHeight + 6

    background.style.display = "flex"
    background.style.alignItems = "center"
    background.style.justifyContent = "center"
    background.style.boxSizing = "border-box"
    background.style.width = `${width}px`
    background.style.height = `${height}px`
    background.style.padding = "3px 8px"
    background.style.border = `1px solid ${t.accent}`
    background.style.borderRadius = "999px"
    background.style.background = t.accentWash
    background.style.color = t.accent
    background.style.fontWeight = "600"
    background.style.lineHeight = "1.2"
    background.style.textAlign = "center"

    foreignObject.setAttribute("width", String(width))
    foreignObject.setAttribute("height", String(height))
    labelGroup.setAttribute("transform", `translate(${-width / 2}, ${-height / 2})`)
  })
}

/** Add a rounded outline without clipping Mermaid's text labels. */
function roundErEntities(root: SVGSVGElement, t: Theme) {
  const svgNs = "http://www.w3.org/2000/svg"
  root.querySelectorAll<SVGGElement>("g.node").forEach((node) => {
    const outer = node.querySelector<SVGPathElement>("path.outer-path")
    if (!outer || node.dataset.rounded) return
    node.dataset.rounded = "1"
    const { x, y, width, height } = outer.getBBox()
    outer.setAttribute("stroke", "none")
    // Keep labels outside the background path's clipping box when Mermaid's
    // measured width is a few pixels too narrow.
    const border = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    border.setAttribute("x", String(x + 0.5))
    border.setAttribute("y", String(y + 0.5))
    border.setAttribute("width", String(width - 1))
    border.setAttribute("height", String(height - 1))
    border.setAttribute("rx", String(ER_RADIUS - 0.5))
    border.setAttribute("fill", "none")
    border.setAttribute("stroke", t.border)
    border.setAttribute("stroke-width", "1")
    node.appendChild(border)
  })
}

export function MermaidDiagram({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, "-")
  const hostRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const isEr = /^\s*erDiagram\b/m.test(chart)

  useEffect(() => {
    let active = true

    async function renderChart() {
      try {
        const mermaid = (await import("mermaid")).default
        const t = hostRef.current ? readTheme(hostRef.current) : readTheme(document.documentElement)
        // ER tables need visible row/border structure; flowchart nodes look best transparent.
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          fontFamily: t.font,
          er: { useMaxWidth: false, entityPadding: 32, diagramPadding: 24, minEntityWidth: 320 },
          themeVariables: {
            background: "transparent",
            primaryColor: isEr ? t.surface2 : "transparent",
            primaryBorderColor: isEr ? t.border : t.textMuted,
            primaryTextColor: t.text,
            secondaryColor: "transparent",
            tertiaryColor: "transparent",
            lineColor: isEr ? t.borderStrong : t.line,
            textColor: t.text,
            fontSize: "13px",
            edgeLabelBackground: "transparent",
            labelBkgColor: "transparent",
            clusterBkg: "transparent",
            clusterBorder: t.textMuted,
            nodeTextColor: t.text,
            // Mermaid 11 ER renderer: entity header uses mainBkg, rows use rowOdd/rowEven.
            mainBkg: isEr ? t.surface2 : "transparent",
            nodeBorder: isEr ? t.border : t.textMuted,
            rowOdd: t.surface,
            rowEven: t.bg,
          },
        })
        const svgId = `flux-document-${id}`
        const rendered = await mermaid.render(svgId, chart)
        const polished = isEr ? withErPolish(rendered.svg, svgId, t) : rendered.svg
        if (active) { setSvg(polished); setError(null) }
      } catch {
        if (active) setError("Diagrammet kunde inte visas. Kontrollera Mermaid-koden.")
      }
    }

    void renderChart()
    return () => {
      active = false
    }
  }, [chart, id])

  // Rounding needs the SVG mounted (getBBox), so it runs after the markup lands.
  useEffect(() => {
    if (!svg || !isEr) return
    const el = svgRef.current?.querySelector("svg")
    if (!el) return
    const host = hostRef.current ?? document.documentElement
    const theme = readTheme(host)
    roundErEntities(el as SVGSVGElement, theme)
    styleErLabels(el as SVGSVGElement, theme)
  }, [svg, isEr])

  return (
    <div ref={hostRef}>
      {error ? (
        <p role="alert" className="text-sm text-danger">{error}</p>
      ) : !svg ? (
        <p className="text-sm text-text-muted">Ritar diagram…</p>
      ) : (
        <div className="relative">
          <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-md border border-border bg-surface/95 p-1 shadow-sm">
            <button
              type="button"
              aria-label="Zooma ut"
              onClick={() => setZoom(value => Math.max(0.5, Number((value - 0.1).toFixed(2))))}
              className="size-7 rounded text-sm font-semibold text-text-muted hover:bg-surface-2 hover:text-text"
            >
              −
            </button>
            <button
              type="button"
              aria-label="Återställ zoom"
              onClick={() => setZoom(1)}
              className="min-w-12 rounded px-1 text-xs font-medium text-text-muted hover:bg-surface-2 hover:text-text"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              aria-label="Zooma in"
              onClick={() => setZoom(value => Math.min(2, Number((value + 0.1).toFixed(2))))}
              className="size-7 rounded text-sm font-semibold text-text-muted hover:bg-surface-2 hover:text-text"
            >
              +
            </button>
          </div>
          <div className="max-h-[70vh] overflow-auto rounded-md bg-bg p-3">
            <div ref={svgRef} style={{ zoom }} className="w-max min-w-full [&_svg]:h-auto [&_svg]:max-w-none" dangerouslySetInnerHTML={{ __html: svg }} />
          </div>
        </div>
      )}
    </div>
  )
}
