"use client"

import { useEffect, useRef, useState } from "react"
import type { TempusSoundRecording } from "@/app/lib/dal"
import { axisKhz, clock, DEFAULT_RANGE, heightShare, lengthSeconds, loadStrengths, paintInk, type SonogramData } from "./sound-plate"

type Range = { minHz: number; maxHz: number }

export type OverlayLayer = {
  key: string
  recording: TempusSoundRecording
  /** The CSS variable of the species' ink. */
  ink: string
  name: string
  current: number
  playing: boolean
}

function InkLayer({ layer, width, bottom, height, onReady }: {
  layer: OverlayLayer
  /** Shares of the sheet, in percent: how wide the recording is and where its frequencies lie. */
  width: number
  bottom: number
  height: number
  onReady: (key: string, range: Range) => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const strengths = useRef<SonogramData | null>(null)
  const [ready, setReady] = useState(false)
  const { recording, ink, key } = layer

  useEffect(() => {
    let active = true
    loadStrengths(recording)
      .then((result) => {
        if (!active || !canvas.current) return
        strengths.current = result
        paintInk(canvas.current, result.strengths, ink)
        setReady(true)
        onReady(key, { minHz: result.minHz, maxHz: result.maxHz })
      })
      .catch(() => { if (active) onReady(key, DEFAULT_RANGE) })
    return () => { active = false }
  }, [recording, ink, key, onReady])

  // Repaint in the new colours when the theme changes.
  useEffect(() => {
    const repaint = () => {
      if (canvas.current && strengths.current) paintInk(canvas.current, strengths.current.strengths, ink)
    }
    const observer = new MutationObserver(repaint)
    observer.observe(document.documentElement, { attributes: true })
    const scheme = window.matchMedia("(prefers-color-scheme: dark)")
    scheme.addEventListener("change", repaint)
    return () => { observer.disconnect(); scheme.removeEventListener("change", repaint) }
  }, [ink])

  return (
    <canvas
      ref={canvas}
      aria-label={`Sonogram för ${layer.name}`}
      style={{ width: `${width}%`, height: `${height}%`, bottom: `${bottom}%` }}
      className={`absolute left-0 block transition-opacity duration-200 motion-reduce:transition-none ${ready ? "opacity-100" : "opacity-0"}`}
    />
  )
}

/**
 * Every recording printed over the others on one sheet, each in its own ink and on one time scale,
 * so it shows where the species share frequencies and how long each one goes on.
 */
export function SonogramOverlay({ layers }: { layers: OverlayLayer[] }) {
  // The frequencies each loaded recording is drawn over; the sheet reaches from the lowest to the highest of them.
  const [ranges, setRanges] = useState<Record<string, Range>>({})
  const onReady = useRef((key: string, range: Range) => setRanges((current) => (
    current[key]?.minHz === range.minHz && current[key]?.maxHz === range.maxHz ? current : { ...current, [key]: range }
  ))).current
  const longest = Math.max(1, ...layers.map((layer) => lengthSeconds(layer.recording.length)))
  const pending = layers.some((layer) => !(layer.key in ranges))
  const loaded = layers.flatMap((layer) => (ranges[layer.key] ? [ranges[layer.key]] : []))
  const axisMin = loaded.length > 0 ? Math.min(...loaded.map((range) => range.minHz)) : DEFAULT_RANGE.minHz
  const axisMax = loaded.length > 0 ? Math.max(...loaded.map((range) => range.maxHz)) : DEFAULT_RANGE.maxHz

  return (
    <div>
      <div className="relative h-48 overflow-hidden border-y border-border bg-surface sm:h-64">
        {axisKhz(axisMin, axisMax).map((khz) => (
          <span key={khz} aria-hidden="true" className="pointer-events-none absolute inset-x-0 border-t border-border/60" style={{ top: `${(1 - heightShare(khz, axisMin, axisMax)) * 100}%` }}>
            <span className="absolute left-1 top-0.5 font-display text-[9px] italic leading-none text-text-faint">{khz} kHz</span>
          </span>
        ))}
        {layers.map((layer) => (
          <InkLayer key={`${layer.key}:${layer.recording.id}`} layer={layer} width={lengthSeconds(layer.recording.length) / longest * 100} bottom={((ranges[layer.key]?.minHz ?? axisMin) - axisMin) / (axisMax - axisMin) * 100} height={((ranges[layer.key]?.maxHz ?? axisMax) - (ranges[layer.key]?.minHz ?? axisMin)) / (axisMax - axisMin) * 100} onReady={onReady} />
        ))}
        {layers.map((layer) => (
          layer.current > 0 ? (
            <span
              key={`head-${layer.key}`}
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 w-px"
              style={{ left: `${Math.min(100, layer.current / longest * 100)}%`, backgroundColor: `var(${layer.ink})` }}
            />
          ) : null
        ))}
        {pending ? <span className="absolute inset-0 grid place-items-center text-xs italic text-text-muted">Ritar sonogram…</span> : null}
      </div>
      <div className="mt-2 flex items-center justify-between font-display text-[10px] italic text-text-faint">
        <span>0:00</span>
        <span>{clock(longest)}</span>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
        {layers.map((layer) => (
          <li key={layer.key} className="flex items-center gap-2 font-display text-xs italic text-text-muted">
            <span aria-hidden="true" className="h-0.5 w-5" style={{ backgroundColor: `var(${layer.ink})` }} />
            <span className="capitalize">{layer.name}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
