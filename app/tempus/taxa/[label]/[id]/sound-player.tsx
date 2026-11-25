"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import type { TempusSoundRecording } from "@/app/lib/dal"
import { Plate, placeName, soundName } from "@/app/tempus/ui/sound-plate"

export default function SoundPlayer({ recordings, totalCount, artfakta }: { recordings: TempusSoundRecording[]; totalCount: number; artfakta: ReactNode }) {
  const playerTop = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(8)
  const previousVisible = useRef(visible)
  const selected = recordings[index]
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    playerTop.current?.animate(
      [{ opacity: 0.65, transform: "translateY(3px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 180, easing: "ease-out" },
    )
  }, [index])
  useEffect(() => {
    const previous = previousVisible.current
    previousVisible.current = visible
    if (visible <= previous || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    Array.from(listRef.current?.children ?? []).slice(previous).forEach((row, offset) => {
      row.animate(
        [{ opacity: 0, transform: "translateY(5px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: 200, delay: Math.min(offset, 8) * 18, easing: "ease-out", fill: "both" },
      )
    })
  }, [visible])
  const choose = (position: number) => {
    setIndex(position)
  }

  return (
    <div className="grid min-w-0 gap-x-6 gap-y-6 xl:grid-cols-3">
      <div ref={playerTop} className="min-w-0 xl:col-span-2">
        {selected ? <Plate key={String(selected.id)} recording={selected} /> : null}
      </div>
      <div className="min-w-0 xl:col-start-3 xl:row-span-2 xl:border-l xl:border-border xl:pl-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-2">
        <h3 className="text-sm font-medium">Inspelningar</h3>
        <span className="text-xs italic text-text-muted">{Math.min(visible, recordings.length)} av {recordings.length} tillgängliga{totalCount > recordings.length ? ` · ${totalCount} totalt hos Xeno-canto` : ""}</span>
      </div>
      <ol ref={listRef} className="grid sm:grid-cols-2 sm:gap-x-6 xl:grid-cols-1 xl:gap-x-0">
        {recordings.slice(0, visible).map((item, position) => (
          <li key={String(item.id)} className="min-w-0 border-b border-border">
            <button type="button" onClick={() => choose(position)} aria-current={position === index ? "true" : undefined}
              className={`grid w-full cursor-pointer grid-cols-[1.5rem_minmax(0,1fr)_auto] gap-x-2 py-2.5 text-left transition-colors duration-150 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${position === index ? "text-accent" : "text-text"}`}>
              <span className="pt-0.5 font-mono text-[10px] tabular-nums text-text-muted">{String(position + 1).padStart(2, "0")}</span>
              <span className="col-span-2 min-w-0 text-sm leading-5">{soundName(item.sound_type)}</span>
              <span className="col-start-2 mt-0.5 min-w-0 truncate font-mono text-[10px] text-text-muted">XC{item.id} · {placeName(item)}</span>
              <span className="mt-0.5 font-mono text-[10px] tabular-nums text-text-muted">{item.length}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {visible < recordings.length ? <button type="button" onClick={() => setVisible((count) => count + 12)} className="cursor-pointer text-xs text-accent underline decoration-accent/40 underline-offset-4 transition-colors duration-150 hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Visa fler inspelningar ({recordings.length - visible} kvar)</button> : null}
        {visible > 8 ? <button type="button" onClick={() => setVisible(8)} className="cursor-pointer text-xs text-text-muted underline decoration-border underline-offset-4 transition-colors duration-150 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Visa färre</button> : null}
      </div>
      </div>
      <div className="min-w-0 xl:col-span-2">{artfakta}</div>
    </div>
  )
}
