"use client"

import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import {
  Circle,
  Grid3x3,
  Maximize,
  MousePointer2,
  Pentagon,
  Plus,
  Redo2,
  Ruler,
  Save,
  Scaling,
  Slash,
  Spline,
  Square,
  StickyNote,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { saveDrawingPage } from "@/app/actions/drawing"
import { Button } from "@/app/components/ui/Button"
import type { Drawing, DrawingElement, DrawingPage, DrawingRole } from "@/app/lib/dal"
import { AddRectForm } from "./add-rect-form"
import { ElementView } from "./element-view"
import {
  computeArea,
  constrainAngle,
  distance,
  formatArea,
  formatLength,
  nearestAnchor,
  newId,
  niceStep,
  snapToGrid,
  translateElement,
  type Pt,
} from "./geometry"
import { historyReducer, initialHistory } from "./history"
import { PageSizeForm } from "./page-size-form"
import { PropertiesPanel } from "./properties-panel"

type Tool = "select" | "line" | "polyline" | "polygon" | "rect" | "ellipse" | "dimension" | "text" | "note"

const TOOLS: { tool: Tool; label: string; key: string; icon: typeof Slash }[] = [
  { tool: "select", label: "Markera", key: "v", icon: MousePointer2 },
  { tool: "line", label: "Linje", key: "l", icon: Slash },
  { tool: "polyline", label: "Polylinje", key: "p", icon: Spline },
  { tool: "polygon", label: "Polygon", key: "g", icon: Pentagon },
  { tool: "rect", label: "Rektangel", key: "r", icon: Square },
  { tool: "ellipse", label: "Ellips", key: "e", icon: Circle },
  { tool: "dimension", label: "Mått", key: "d", icon: Ruler },
  { tool: "text", label: "Text", key: "t", icon: Type },
  { tool: "note", label: "Notering", key: "n", icon: StickyNote },
]

// Pixels per drawing unit. Must cover a 30 m page in mm as well as a 10 cm page in m.
const MIN_SCALE = 1e-6
const MAX_SCALE = 1e6
const GRID_MIN_PX = 14
const ANCHOR_SNAP_PX = 10

type View = { x: number; y: number; scale: number }

type Gesture =
  | { kind: "pan"; lastX: number; lastY: number }
  | { kind: "move"; id: string; start: Pt; original: DrawingElement; checkpointed: boolean }
  | { kind: "handle"; id: string; index: number; checkpointed: boolean }

function buildElement(tool: Tool, pts: Pt[], textSize: number, role?: DrawingRole): DrawingElement | null {
  const [a, b] = pts
  switch (tool) {
    case "line":
      return b && distance(a, b) > 0 ? { id: newId(), type: "line", x1: a.x, y1: a.y, x2: b.x, y2: b.y } : null
    case "rect": {
      if (!b || a.x === b.x || a.y === b.y) return null
      return {
        id: newId(),
        type: "rect",
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        width: Math.abs(b.x - a.x),
        height: Math.abs(b.y - a.y),
        ...(role && { role }),
      }
    }
    case "ellipse": {
      if (!b || a.x === b.x || a.y === b.y) return null
      return { id: newId(), type: "ellipse", cx: a.x, cy: a.y, rx: Math.abs(b.x - a.x), ry: Math.abs(b.y - a.y) }
    }
    case "dimension":
      return b && distance(a, b) > 0
        ? { id: newId(), type: "dimension", x1: a.x, y1: a.y, x2: b.x, y2: b.y, offset: textSize * 3 }
        : null
    case "polyline":
      return pts.length >= 2 ? { id: newId(), type: "polyline", points: pts } : null
    case "polygon":
      return pts.length >= 3
        ? { id: newId(), type: "polygon", points: pts.map((p): [number, number] => [p.x, p.y]), ...(role && { role }) }
        : buildElement("polyline", pts, textSize)
    default:
      return null
  }
}

function setAnchor(el: DrawingElement, index: number, p: Pt): DrawingElement {
  if (el.type === "line" || el.type === "dimension") {
    return index === 0 ? { ...el, x1: p.x, y1: p.y } : { ...el, x2: p.x, y2: p.y }
  }
  if (el.type === "polyline") {
    return { ...el, points: el.points.map((q, i) => (i === index ? p : q)) }
  }
  if (el.type === "polygon") {
    return { ...el, points: el.points.map((q, i): [number, number] => (i === index ? [p.x, p.y] : q)) }
  }
  return el
}

function handlePoints(el: DrawingElement): Pt[] {
  if (el.type === "line" || el.type === "dimension") {
    return [
      { x: el.x1, y: el.y1 },
      { x: el.x2, y: el.y2 },
    ]
  }
  if (el.type === "polygon") return el.points.map(([x, y]) => ({ x, y }))
  return el.type === "polyline" ? el.points : []
}

const isTypingTarget =(t: EventTarget | null) =>
  t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")

export function PageEditor({
  drawing,
  page,
  onDirtyChange,
}: {
  drawing: Drawing
  page: DrawingPage
  onDirtyChange: (dirty: boolean) => void
}) {
  const [history, dispatch] = useReducer(historyReducer, page.elements, initialHistory)
  const elements = history.present
  const [saved, setSaved] = useState(page.elements)

  const [tool, setTool] = useState<Tool>("select")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Pt[]>([])
  const [cursor, setCursor] = useState<Pt | null>(null)
  const [view, setView] = useState<View | null>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const spaceDown = useRef(false)
  const editing = useRef(false)

  const [pageSize, setPageSize] = useState({ width: page.width, height: page.height })
  const [savedSize, setSavedSize] = useState(pageSize)
  const [sizeOpen, setSizeOpen] = useState(false)
  const [addRectOpen, setAddRectOpen] = useState(false)
  const [snapOn, setSnapOn] = useState(true)
  const [role, setRole] = useState<DrawingRole | undefined>(undefined)
  const sizeDirty = pageSize.width !== savedSize.width || pageSize.height !== savedSize.height
  const dirty = elements !== saved || sizeDirty
  const textSize = pageSize.height / 40
  const selected = elements.find((el) => el.id === selectedId) ?? null

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const fit = useCallback(
    (s: { w: number; h: number }, dims = pageSize) => {
      const scale = Math.min(s.w / (dims.width * 1.1), s.h / (dims.height * 1.1))
      setView({ scale, x: dims.width / 2 - s.w / 2 / scale, y: dims.height / 2 - s.h / 2 / scale })
    },
    [pageSize]
  )

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setSize({ w: width, h: height })
    })
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [])

  const hasView = view !== null
  useEffect(() => {
    if (size && !hasView) fit(size)
  }, [size, hasView, fit])

  // Wheel must be non-passive to prevent the page from scrolling while zooming.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = svg.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      const factor = Math.exp(-e.deltaY * 0.0015)
      setView((v) => {
        if (!v) return v
        const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor))
        const wx = v.x + sx / v.scale
        const wy = v.y + sy / v.scale
        return { scale, x: wx - sx / scale, y: wy - sy / scale }
      })
    }
    svg.addEventListener("wheel", onWheel, { passive: false })
    return () => svg.removeEventListener("wheel", onWheel)
  }, [])

  const zoomBy = (factor: number) => {
    if (!size) return
    setView((v) => {
      if (!v) return v
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor))
      const wx = v.x + size.w / 2 / v.scale
      const wy = v.y + size.h / 2 / v.scale
      return { scale, x: wx - size.w / 2 / scale, y: wy - size.h / 2 / scale }
    })
  }

  const gridStep = view ? niceStep(GRID_MIN_PX / view.scale) : 1

  const toWorld = (e: { clientX: number; clientY: number }): Pt => {
    const rect = svgRef.current!.getBoundingClientRect()
    return { x: view!.x + (e.clientX - rect.left) / view!.scale, y: view!.y + (e.clientY - rect.top) / view!.scale }
  }

  /**
   * Snap order: existing anchor points, then 45 degree lock (Shift), then grid.
   * Alt or the snap toggle turns anchor and grid snapping off (old houses are rarely on a round grid).
   */
  const snap = (raw: Pt, opts: { from?: Pt; shift: boolean; alt: boolean; skipId?: string }): Pt => {
    if (opts.alt) return raw
    if (snapOn) {
      const others = opts.skipId ? elements.filter((el) => el.id !== opts.skipId) : elements
      const anchor = nearestAnchor(raw, others, ANCHOR_SNAP_PX / view!.scale)
      if (anchor) return anchor
    }
    if (opts.shift && opts.from) return constrainAngle(opts.from, raw)
    return snapOn ? snapToGrid(raw, gridStep) : raw
  }

  const commitElement = (el: DrawingElement) => dispatch({ type: "commit", elements: [...elements, el] })

  const finishMultiPoint = (points: Pt[]) => {
    const el = buildElement(tool, points, textSize, role)
    if (el) commitElement(el)
    setDraft([])
  }

  /** Adds a rectangle from typed measurements, centered in the visible area. */
  const addTypedRect = (width: number, height: number, rectRole: DrawingRole | undefined) => {
    const centre = view && size ? { x: view.x + size.w / 2 / view.scale, y: view.y + size.h / 2 / view.scale } : { x: pageSize.width / 2, y: pageSize.height / 2 }
    const el: DrawingElement = {
      id: newId(),
      type: "rect",
      x: centre.x - width / 2,
      y: centre.y - height / 2,
      width,
      height,
      ...(rectRole && { role: rectRole }),
    }
    commitElement(el)
    setTool("select")
    setSelectedId(el.id)
    setAddRectOpen(false)
  }

  const applyPageSize = (width: number, height: number) => {
    const next = { width, height }
    setPageSize(next)
    setSizeOpen(false)
    if (size) fit(size, next)
  }

  const cancelDraft = () => setDraft([])

  const chooseTool = (next: Tool) => {
    setTool(next)
    setDraft([])
    if (next !== "select") setSelectedId(null)
  }

  const deleteSelected = () => {
    if (!selectedId) return
    dispatch({ type: "commit", elements: elements.filter((el) => el.id !== selectedId) })
    setSelectedId(null)
  }

  const editSelected = (next: DrawingElement) => {
    if (!editing.current) {
      dispatch({ type: "checkpoint" })
      editing.current = true
    }
    dispatch({ type: "replace", elements: elements.map((el) => (el.id === next.id ? next : el)) })
  }

  const endEdit = () => {
    editing.current = false
  }

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!view) return
    wrapRef.current?.focus({ preventScroll: true })
    const target = e.target as Element
    const raw = toWorld(e)
    const panning = e.button === 1 || spaceDown.current

    if (panning) {
      gesture.current = { kind: "pan", lastX: e.clientX, lastY: e.clientY }
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }
    if (e.button !== 0) return

    if (tool === "select") {
      const handle = target.closest("[data-handle]")
      if (handle && selected) {
        gesture.current = { kind: "handle", id: selected.id, index: Number(handle.getAttribute("data-handle")), checkpointed: false }
        e.currentTarget.setPointerCapture(e.pointerId)
        return
      }
      const hitId = target.closest("[data-element-id]")?.getAttribute("data-element-id") ?? null
      const hitEl = elements.find((el) => el.id === hitId)
      setSelectedId(hitEl?.id ?? null)
      gesture.current = hitEl
        ? { kind: "move", id: hitEl.id, start: raw, original: hitEl, checkpointed: false }
        : { kind: "pan", lastX: e.clientX, lastY: e.clientY }
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }

    const p = snap(raw, { from: draft.at(-1), shift: e.shiftKey, alt: e.altKey })

    if (tool === "text" || tool === "note") {
      const el: DrawingElement =
        tool === "text"
          ? { id: newId(), type: "text", x: p.x, y: p.y, text: "Text" }
          : { id: newId(), type: "note", x: p.x, y: p.y, text: "Notering" }
      commitElement(el)
      setSelectedId(el.id)
      setTool("select")
      return
    }

    if (tool === "polyline" || tool === "polygon") {
      if (tool === "polygon" && draft.length >= 3 && distance(p, draft[0]) < 1e-9) {
        finishMultiPoint(draft)
      } else if (!draft.length || distance(p, draft.at(-1)!) > 1e-9) {
        setDraft([...draft, p])
      }
      return
    }

    if (!draft.length) {
      setDraft([p])
      return
    }
    const el = buildElement(tool, [draft[0], p], textSize, role)
    if (el) commitElement(el)
    setDraft([])
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!view) return
    const g = gesture.current
    const raw = toWorld(e)

    if (g?.kind === "pan") {
      const dx = e.clientX - g.lastX
      const dy = e.clientY - g.lastY
      gesture.current = { ...g, lastX: e.clientX, lastY: e.clientY }
      setView({ ...view, x: view.x - dx / view.scale, y: view.y - dy / view.scale })
      return
    }

    if (g?.kind === "move") {
      let dx = raw.x - g.start.x
      let dy = raw.y - g.start.y
      if (!e.altKey && snapOn) {
        dx = Math.round(dx / gridStep) * gridStep
        dy = Math.round(dy / gridStep) * gridStep
      }
      if (!g.checkpointed) {
        if (dx === 0 && dy === 0) return
        dispatch({ type: "checkpoint" })
        gesture.current = { ...g, checkpointed: true }
      }
      dispatch({
        type: "replace",
        elements: elements.map((el) => (el.id === g.id ? translateElement(g.original, dx, dy) : el)),
      })
      return
    }

    if (g?.kind === "handle") {
      const el = elements.find((x) => x.id === g.id)
      if (!el) return
      const points = handlePoints(el)
      const from = points[g.index === 0 ? 1 : g.index - 1]
      const p = snap(raw, { from, shift: e.shiftKey, alt: e.altKey, skipId: el.id })
      if (!g.checkpointed) {
        dispatch({ type: "checkpoint" })
        gesture.current = { ...g, checkpointed: true }
      }
      dispatch({ type: "replace", elements: elements.map((x) => (x.id === el.id ? setAnchor(x, g.index, p) : x)) })
      return
    }

    if (tool !== "select") setCursor(snap(raw, { from: draft.at(-1), shift: e.shiftKey, alt: e.altKey }))
  }

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    gesture.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const save = useCallback(async () => {
    setSaving(true)
    setError(null)
    const result = await saveDrawingPage(drawing.id, { ...page, ...pageSize }, elements)
    setSaving(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    setSaved(elements)
    setSavedSize(pageSize)
  }, [drawing.id, page, pageSize, elements])

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isTypingTarget(e.target)) return
    const mod = e.ctrlKey || e.metaKey
    const key = e.key.toLowerCase()

    if (mod && key === "s") {
      e.preventDefault()
      if (dirty && !saving) void save()
    } else if (mod && key === "z") {
      e.preventDefault()
      dispatch({ type: e.shiftKey ? "redo" : "undo" })
    } else if (mod && key === "y") {
      e.preventDefault()
      dispatch({ type: "redo" })
    } else if (e.key === " ") {
      e.preventDefault()
      spaceDown.current = true
    } else if (e.key === "Escape") {
      if (draft.length) cancelDraft()
      else setSelectedId(null)
    } else if (e.key === "Enter" && (tool === "polyline" || tool === "polygon") && draft.length >= 2) {
      finishMultiPoint(draft)
    } else if (e.key === "Delete" || e.key === "Backspace") {
      deleteSelected()
    } else if (!mod) {
      const match = TOOLS.find((t) => t.key === key)
      if (match) chooseTool(match.tool)
    }
  }

  const draftElement = draft.length && cursor && tool !== "select" ? buildElement(tool, [...draft, cursor], textSize, role) : null
  const area = computeArea(elements, drawing.unit)
  const handles = selected ? handlePoints(selected) : []
  const handleRadius = view ? 6 / view.scale : 0
  const hint =
    tool === "select"
      ? selected
        ? "Dra objektet för att flytta det, eller dra i punkterna för att ändra formen."
        : "Klicka på ett objekt för att markera det. Dra på tom yta för att panorera."
      : tool === "text" || tool === "note"
        ? `${TOOLS.find((t) => t.tool === tool)?.label}: klicka där den ska placeras.`
        : tool === "polyline" || tool === "polygon"
          ? draft.length
            ? "Klicka för nästa punkt. Enter eller dubbelklick avslutar."
            : `${TOOLS.find((t) => t.tool === tool)?.label}: klicka för första punkten.`
          : draft.length
            ? "Klicka för andra punkten. Esc avbryter."
            : `${TOOLS.find((t) => t.tool === tool)?.label}: klicka för första punkten.`

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button type="button" variant="secondary" size="sm" aria-label="Ångra" title="Ångra (Ctrl+Z)" disabled={!history.past.length} onClick={() => dispatch({ type: "undo" })}>
            <Undo2 size={16} />
          </Button>
          <Button type="button" variant="secondary" size="sm" aria-label="Gör om" title="Gör om (Ctrl+Y)" disabled={!history.future.length} onClick={() => dispatch({ type: "redo" })}>
            <Redo2 size={16} />
          </Button>
          <span className="mx-1 h-6 w-px bg-border" />
          <Button type="button" variant="secondary" size="sm" aria-label="Zooma in" onClick={() => zoomBy(1.4)}>
            <ZoomIn size={16} />
          </Button>
          <Button type="button" variant="secondary" size="sm" aria-label="Zooma ut" onClick={() => zoomBy(1 / 1.4)}>
            <ZoomOut size={16} />
          </Button>
          <Button type="button" variant="secondary" size="sm" aria-label="Anpassa till sidan" title="Anpassa till ritytan" onClick={() => size && fit(size)}>
            <Maximize size={16} />
          </Button>
          <Button
            type="button"
            variant={snapOn ? "primary" : "secondary"}
            size="sm"
            aria-pressed={snapOn}
            title="Snappa till rutnät och punkter. Av = fria mått."
            onClick={() => setSnapOn((s) => !s)}
          >
            <Grid3x3 size={16} />
            Snappa
          </Button>
          <span className="mx-1 h-6 w-px bg-border" />
          <Button type="button" variant="secondary" size="sm" title="Ange ritytans mått" onClick={() => { setSizeOpen((o) => !o); setAddRectOpen(false) }}>
            <Scaling size={16} />
            Ritytans storlek
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {error && (
              <span role="alert" className="text-sm text-danger">
                {error}
              </span>
            )}
            <Button type="button" size="sm" disabled={!dirty || saving} onClick={() => void save()}>
              <Save size={16} />
              {saving ? "Sparar..." : "Spara"}
            </Button>
          </div>
        </div>

        <div className="min-h-8">
        {(tool === "rect" || tool === "polygon") && (
          <div className="flex flex-wrap items-center gap-1.5 text-sm text-text-muted">
            Rita som:
            {([
              [undefined, "Ritning"],
              ["surface", "Yta att täcka"],
              ["opening", "Öppning (fönster, dörr)"],
            ] as const).map(([value, label]) => (
              <Button
                key={label}
                type="button"
                size="sm"
                variant={role === value ? "primary" : "secondary"}
                aria-pressed={role === value}
                onClick={() => setRole(value)}
              >
                {label}
              </Button>
            ))}
            {tool === "rect" && (
              <Button type="button" size="sm" variant="ghost" onClick={() => { setAddRectOpen((o) => !o); setSizeOpen(false) }}>
                <Plus size={14} />
                Skriv in mått i stället
              </Button>
            )}
          </div>
        )}
        </div>

        <div className="flex gap-2">
        <div className="flex shrink-0 flex-col gap-1.5">
          {TOOLS.map(({ tool: t, label, key, icon: Icon }) => (
            <Button
              key={t}
              type="button"
              variant={tool === t ? "primary" : "secondary"}
              size="sm"
              title={`${label} (${key.toUpperCase()})`}
              aria-label={label}
              aria-pressed={tool === t}
              onClick={() => chooseTool(t)}
            >
              <Icon size={18} />
            </Button>
          ))}
        </div>
        <div
          ref={wrapRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onKeyUp={(e) => {
            if (e.key === " ") spaceDown.current = false
          }}
          className="relative h-[calc(100dvh-13rem)] min-h-96 min-w-0 flex-1 overflow-hidden rounded border border-border bg-surface-2 text-text outline-none focus:border-accent"
        >
          {view && size && (
            <svg
              ref={svgRef}
              width={size.w}
              height={size.h}
              viewBox={`${view.x} ${view.y} ${size.w / view.scale} ${size.h / view.scale}`}
              className="absolute inset-0 touch-none select-none"
              style={{ cursor: tool === "select" ? "default" : "crosshair" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={() => setCursor(null)}
              onDoubleClick={() => {
                if ((tool === "polyline" || tool === "polygon") && draft.length >= 2) finishMultiPoint(draft)
              }}
            >
              <defs>
                <pattern id="ritning-grid" width={gridStep} height={gridStep} patternUnits="userSpaceOnUse">
                  <path d={`M ${gridStep} 0 L 0 0 0 ${gridStep}`} fill="none" stroke="var(--border)" strokeWidth={1 / view.scale} />
                </pattern>
              </defs>
              <rect x={0} y={0} width={pageSize.width} height={pageSize.height} fill="var(--surface)" />
              <rect x={0} y={0} width={pageSize.width} height={pageSize.height} fill="url(#ritning-grid)" pointerEvents="none" />
              <rect
                x={0}
                y={0}
                width={pageSize.width}
                height={pageSize.height}
                fill="none"
                stroke="var(--text-faint)"
                strokeWidth={1 / view.scale}
                pointerEvents="none"
              />

              {elements.map((el) => (
                <ElementView key={el.id} el={el} selected={el.id === selectedId} unit={drawing.unit} textSize={textSize} />
              ))}

              {draftElement && (
                <g opacity={0.6} pointerEvents="none">
                  <ElementView el={draftElement} selected={false} unit={drawing.unit} textSize={textSize} />
                </g>
              )}
              {draft.length > 0 &&
                draft.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={handleRadius * 0.6} fill="var(--accent)" pointerEvents="none" />)}
              {cursor && tool !== "select" && (
                <circle cx={cursor.x} cy={cursor.y} r={handleRadius * 0.8} fill="none" stroke="var(--accent)" strokeWidth={1 / view.scale} pointerEvents="none" />
              )}

              {handles.map((p, i) => (
                <circle
                  key={i}
                  data-handle={i}
                  cx={p.x}
                  cy={p.y}
                  r={handleRadius}
                  fill="var(--surface)"
                  stroke="var(--accent)"
                  strokeWidth={2 / view.scale}
                  style={{ cursor: "move" }}
                />
              ))}
            </svg>
          )}

          <div className="pointer-events-none absolute left-3 top-3 max-w-[60%] rounded bg-surface/90 px-2.5 py-1.5 text-sm text-text shadow-sm">
            {hint}
          </div>

          {(sizeOpen || addRectOpen) && (
            <div className="absolute left-1/2 top-16 z-10 w-64 -translate-x-1/2 rounded border border-border bg-surface p-3 shadow-md">
              {sizeOpen ? (
                <PageSizeForm
                  unit={drawing.unit}
                  width={pageSize.width}
                  height={pageSize.height}
                  onApply={applyPageSize}
                  onCancel={() => setSizeOpen(false)}
                />
              ) : (
                <AddRectForm unit={drawing.unit} defaultRole={role} onAdd={addTypedRect} onCancel={() => setAddRectOpen(false)} />
              )}
            </div>
          )}

          {selected && (
            <div className="absolute right-3 top-3 max-h-[calc(100%-1.5rem)] w-60 overflow-y-auto rounded border border-border bg-surface p-3 shadow-md">
              <PropertiesPanel key={selected.id} el={selected} unit={drawing.unit} onEdit={editSelected} onEditEnd={endEdit} onDelete={deleteSelected} />
            </div>
          )}

          <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-surface/90 px-2.5 py-1.5 text-sm text-text shadow-sm">
            <span className="font-semibold">Netto {formatArea(area.net_m2)}</span>
            <span className="ml-2 text-xs text-text-muted">
              Yta {formatArea(area.surface_m2)} minus öppningar {formatArea(area.openings_m2)}
            </span>
          </div>

          <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-surface/90 px-2.5 py-1.5 font-mono text-xs text-text-muted shadow-sm">
            {cursor ? `${formatLength(cursor.x, drawing.unit)}, ${formatLength(cursor.y, drawing.unit)} · ` : ""}
            rutnät {formatLength(gridStep, drawing.unit)}
          </div>
        </div>
        </div>

        <details className="text-xs text-text-muted">
          <summary className="cursor-pointer">Kortkommandon</summary>
          <p className="m-0 mt-1">
            Snappar till rutnät och befintliga punkter. Shift låser 45 graders vinkel, Alt stänger av snappning. Mellanslag eller mittenknapp panorerar, mushjulet zoomar. Enter eller dubbelklick avslutar polylinje och polygon. Ytan uppdateras när du sparar.
          </p>
        </details>
      </div>
    </div>
  )
}
