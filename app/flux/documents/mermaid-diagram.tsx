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
    #${id} .edgeLabel .label, #${id} .edgeLabel .label span { color: ${t.textMuted}; }
  `
  return svg.replace(/(<svg[^>]*>)/, `$1<style>${css}</style>`)
}

/** Mermaid draws every ER shape as a hard-cornered <path>, so `rx` and CSS
 *  `clip-path: inset(round …)` on the group don't take. Give each entity a real
 *  userSpace clipPath and a matching rounded outline. */
function roundErEntities(root: SVGSVGElement, t: Theme) {
  const svgNs = "http://www.w3.org/2000/svg"
  const defs = root.querySelector("defs") ?? root.insertBefore(document.createElementNS(svgNs, "defs"), root.firstChild)
  root.querySelectorAll<SVGGElement>("g.node").forEach((node, i) => {
    const outer = node.querySelector<SVGPathElement>("path.outer-path")
    if (!outer || node.dataset.rounded) return
    node.dataset.rounded = "1"
    const { x, y, width, height } = outer.getBBox()
    const clipId = `${root.id}-erclip-${i}`
    const clip = document.createElementNS("http://www.w3.org/2000/svg", "clipPath")
    clip.setAttribute("id", clipId)
    clip.setAttribute("clipPathUnits", "userSpaceOnUse")
    const clipRect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    clipRect.setAttribute("x", String(x))
    clipRect.setAttribute("y", String(y))
    clipRect.setAttribute("width", String(width))
    clipRect.setAttribute("height", String(height))
    clipRect.setAttribute("rx", String(ER_RADIUS))
    clip.appendChild(clipRect)
    defs!.appendChild(clip)
    node.setAttribute("clip-path", `url(#${clipId})`)

    outer.setAttribute("stroke", "none")
    // Inset by half a pixel so the stroke sits fully inside the rounded clip.
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
          er: { useMaxWidth: true, entityPadding: 18, diagramPadding: 14, minEntityWidth: 120 },
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
            edgeLabelBackground: t.bg,
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
    roundErEntities(el as SVGSVGElement, readTheme(host))
  }, [svg, isEr])

  return (
    <div ref={hostRef}>
      {error ? (
        <p role="alert" className="text-sm text-danger">{error}</p>
      ) : !svg ? (
        <p className="text-sm text-text-muted">Ritar diagram…</p>
      ) : (
        <div ref={svgRef} className="overflow-x-auto [&_svg]:h-auto [&_svg]:max-w-none" dangerouslySetInnerHTML={{ __html: svg }} />
      )}
    </div>
  )
}
