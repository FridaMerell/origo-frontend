"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Printer } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { Checkbox, Field, fieldInputClass } from "@/app/components/form/Field"
import type { Drawing, DrawingPage } from "@/app/lib/dal"
import { DrawingSheet, PAPERS, type PerSheet } from "./drawing-sheet"

const PX_PER_MM = 96 / 25.4

export function PrintView({
  drawing,
  pages,
  houseName,
}: {
  drawing: Drawing
  pages: DrawingPage[]
  houseName: string
}) {
  const [selected, setSelected] = useState(() => new Set(pages.map((p) => p.id)))
  const [paper, setPaper] = useState<keyof typeof PAPERS>("A3")
  const [landscape, setLandscape] = useState(true)
  const [perSheet, setPerSheet] = useState<PerSheet>(pages.length > 1 ? 2 : 1)
  const [previewWidth, setPreviewWidth] = useState(0)
  const [printRoot, setPrintRoot] = useState<HTMLElement | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const chosen = useMemo(() => pages.filter((p) => selected.has(p.id)), [pages, selected])
  const date = new Date().toLocaleDateString("sv-SE")
  const sheetW = landscape ? PAPERS[paper].width : PAPERS[paper].height
  const sheetH = landscape ? PAPERS[paper].height : PAPERS[paper].width
  const previewScale = previewWidth > 0 ? Math.min(1, previewWidth / (sheetW * PX_PER_MM)) : 0.5

  // A separate node under <body> lets print CSS hide the whole app and print only the sheets.
  useEffect(() => {
    const node = document.createElement("div")
    node.id = "print-root"
    document.body.appendChild(node)
    setPrintRoot(node)
    return () => {
      node.remove()
    }
  }, [])

  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setPreviewWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const chunks = Array.from({ length: Math.ceil(chosen.length / perSheet) }, (_, i) =>
    chosen.slice(i * perSheet, (i + 1) * perSheet)
  )

  const sheets = chunks.map((chunk, i) => (
    <DrawingSheet
      key={chunk[0].id}
      drawing={drawing}
      pages={chunk}
      firstNumber={i * perSheet + 1}
      sheetIndex={i + 1}
      sheetTotal={chunks.length}
      houseName={houseName}
      paper={paper}
      landscape={landscape}
      perSheet={perSheet}
      date={date}
    />
  ))

  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      <style>{`
        @page { size: ${paper} ${landscape ? "landscape" : "portrait"}; margin: 0; }
        #print-root { display: none; }
        @media print {
          body > *:not(#print-root) { display: none !important; }
          #print-root { display: block; }
          html, body { background: #fff !important; }
        }
      `}</style>

      <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-64">
        <div className="flex flex-col gap-2">
          <h2 className="m-0 font-display text-lg font-semibold text-text">Sidor</h2>
          {pages.map((page) => (
            <Checkbox key={page.id} label={page.name} checked={selected.has(page.id)} onChange={() => toggle(page.id)} />
          ))}
          <div className="flex gap-3 text-xs">
            <button type="button" className="text-accent hover:underline" onClick={() => setSelected(new Set(pages.map((p) => p.id)))}>
              Alla
            </button>
            <button type="button" className="text-accent hover:underline" onClick={() => setSelected(new Set())}>
              Ingen
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="m-0 font-display text-lg font-semibold text-text">Papper</h2>
          <Field label="Format">
            <select className={fieldInputClass} value={paper} onChange={(e) => setPaper(e.target.value as keyof typeof PAPERS)}>
              <option value="A3">A3</option>
              <option value="A4">A4</option>
            </select>
          </Field>
          <Field label="Riktning">
            <select className={fieldInputClass} value={landscape ? "landscape" : "portrait"} onChange={(e) => setLandscape(e.target.value === "landscape")}>
              <option value="landscape">Liggande</option>
              <option value="portrait">Stående</option>
            </select>
          </Field>
          <Field label="Sidor per blad">
            <select className={fieldInputClass} value={perSheet} onChange={(e) => setPerSheet(Number(e.target.value) as PerSheet)}>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={4}>4</option>
              <option value={6}>6</option>
            </select>
          </Field>
        </div>

        <Button type="button" disabled={!chosen.length} onClick={() => window.print()}>
          <Printer size={16} />
          Skriv ut{chunks.length ? ` (${chunks.length} ${chunks.length === 1 ? "blad" : "blad"})` : ""}
        </Button>
        <p className="m-0 text-xs text-text-faint">
          Skriver ut senast sparade version. Alla vyer på ett blad får samma skala, en standardskala som får plats på pappret. I utskriftsdialogen: välj samma pappersformat, sätt marginaler till ingen och slå på bakgrundsgrafik.
        </p>
      </aside>

      <div ref={previewRef} className="flex min-w-0 flex-1 flex-col gap-4">
        {chosen.length === 0 && <p className="m-0 text-sm text-text-muted">Välj minst en sida att skriva ut.</p>}
        {sheets.map((sheet, i) => (
          <div
            key={chunks[i][0].id}
            className="overflow-hidden border border-border shadow-md"
            style={{ width: sheetW * PX_PER_MM * previewScale, height: sheetH * PX_PER_MM * previewScale }}
          >
            <div style={{ width: `${sheetW}mm`, height: `${sheetH}mm`, transform: `scale(${previewScale})`, transformOrigin: "top left" }}>
              {sheet}
            </div>
          </div>
        ))}
      </div>

      {printRoot && createPortal(sheets, printRoot)}
    </div>
  )
}
