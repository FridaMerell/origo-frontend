"use client"

import { useEffect, useId, useRef, useState } from "react"

function readTheme(el: Element) {
  const s = getComputedStyle(el)
  const v = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback
  return {
    bg: v("--bg", "#1b1b2f"),
    surface2: v("--surface-2", "#333355"),
    text: v("--text", "#ece9f5"),
    textMuted: v("--text-muted", "#c0bed2"),
    line: v("--link", v("--secondary", "#4fd8e8")),
    font: v("--font-body", "inherit"),
  }
}

export function MermaidDiagram({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, "-")
  const hostRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function renderChart() {
      try {
        const mermaid = (await import("mermaid")).default
        const t = hostRef.current ? readTheme(hostRef.current) : readTheme(document.documentElement)
        // ER tables need visible row/border structure; flowchart nodes look best transparent.
        const isEr = /^\s*erDiagram\b/m.test(chart)
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          fontFamily: t.font,
          themeVariables: {
            background: "transparent",
            primaryColor: isEr ? t.surface2 : "transparent",
            primaryBorderColor: t.textMuted,
            primaryTextColor: t.text,
            secondaryColor: "transparent",
            tertiaryColor: "transparent",
            lineColor: t.line,
            textColor: t.text,
            fontSize: "13px",
            edgeLabelBackground: t.bg,
            clusterBkg: "transparent",
            clusterBorder: t.textMuted,
            nodeTextColor: t.text,
          },
        })
        const rendered = await mermaid.render(`flux-document-${id}`, chart)
        if (active) { setSvg(rendered.svg); setError(null) }
      } catch {
        if (active) setError("Diagrammet kunde inte visas. Kontrollera Mermaid-koden.")
      }
    }

    void renderChart()
    return () => {
      active = false
    }
  }, [chart, id])

  return (
    <div ref={hostRef}>
      {error ? (
        <p role="alert" className="text-sm text-danger">{error}</p>
      ) : !svg ? (
        <p className="text-sm text-text-muted">Ritar diagram…</p>
      ) : (
        <div className="overflow-x-auto [&_svg]:h-auto [&_svg]:max-w-none" dangerouslySetInnerHTML={{ __html: svg }} />
      )}
    </div>
  )
}
