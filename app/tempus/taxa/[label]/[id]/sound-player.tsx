"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import type { TempusSoundRecording } from "@/app/lib/dal"

const licenceCode = (url: string) => {
  if (url.includes("/publicdomain/zero/")) return "CC0"
  const match = /licenses\/([^/]+)\//.exec(url)
  return match ? match[1].toUpperCase() : ""
}

const clock = (seconds: number) => {
  const whole = Math.max(0, Math.floor(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`
}

const lengthSeconds = (length: string) => {
  const [minutes, seconds] = length.split(":").map(Number)
  return Number.isFinite(minutes) && Number.isFinite(seconds) ? minutes * 60 + seconds : 0
}

const soundNames: Record<string, string> = {
  "call": "Läte",
  "flight call": "Flyktläte",
  "song": "Sång",
  "alarm call": "Varningsläte",
  "perching call": "Kontaktläte",
  "begging call": "Tiggande läte",
  "contact call": "Kontaktläte",
  "juvenile": "Ungfågel",
  "drumming": "Trumning",
  "various calls from the same individual": "Flera läten från samma individ",
}

const soundName = (type: string) => {
  const names = type.split(",").map((part) => soundNames[part.trim().toLowerCase()]).filter(Boolean)
  return [...new Set(names)].join(" · ") || "Inspelning"
}

const countryNames: Record<string, string> = {
  "Iceland": "Island", "Sweden": "Sverige", "Norway": "Norge", "Denmark": "Danmark",
  "Germany": "Tyskland", "United Kingdom": "Storbritannien", "Netherlands": "Nederländerna",
  "France": "Frankrike", "Spain": "Spanien", "Poland": "Polen", "Finland": "Finland",
  "Greece": "Grekland", "Austria": "Österrike", "Portugal": "Portugal",
  "United States": "USA", "Ukraine": "Ukraina", "Russian Federation": "Ryssland",
}

const placeName = (recording: TempusSoundRecording) => {
  const place = recording.country || recording.location
  return countryNames[place] ?? place ?? "Okänd lokal"
}

// Reuse the window and FFT phases for every time slice of a recording.
const FFT_SIZE = 2048
const PLOT_WIDTH = 1200
const PLOT_HEIGHT = 256
const FRAMES = PLOT_WIDTH
const MAX_HZ = 10000
const AXIS_KHZ = [8, 6, 4, 2]
// Per recording: signal strength 0-255 for every pixel, so a theme change only needs a repaint.
const PLOT_CACHE = new Map<string, Uint8Array>()
const WINDOW = new Float32Array(FFT_SIZE)
const PHASES: Array<{ cosine: Float32Array; sine: Float32Array }> = []
for (let i = 0; i < FFT_SIZE; i++) {
  WINDOW[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (FFT_SIZE - 1))
}
for (let span = 2; span <= FFT_SIZE; span <<= 1) {
  const half = span >> 1
  const cosine = new Float32Array(half)
  const sine = new Float32Array(half)
  for (let i = 0; i < half; i++) {
    const angle = -2 * Math.PI * i / span
    cosine[i] = Math.cos(angle)
    sine[i] = Math.sin(angle)
  }
  PHASES.push({ cosine, sine })
}

function spectrum(real: Float32Array, imaginary: Float32Array) {
  const size = real.length
  for (let i = 0; i < size; i++) {
    real[i] *= WINDOW[i]
    imaginary[i] = 0
  }
  for (let i = 0, j = 0; i < size; i++) {
    if (j > i) {
      const value = real[i]
      real[i] = real[j]
      real[j] = value
    }
    let bit = size >> 1
    while (bit && j & bit) { j ^= bit; bit >>= 1 }
    j ^= bit
  }
  for (let span = 2, stage = 0; span <= size; span <<= 1, stage++) {
    const half = span >> 1
    const phases = PHASES[stage]
    for (let start = 0; start < size; start += span) {
      for (let i = 0; i < half; i++) {
        const cosine = phases.cosine[i]
        const sine = phases.sine[i]
        const right = start + i + half
        const left = start + i
        const rr = real[right] * cosine - imaginary[right] * sine
        const ri = real[right] * sine + imaginary[right] * cosine
        real[right] = real[left] - rr
        imaginary[right] = imaginary[left] - ri
        real[left] += rr
        imaginary[left] += ri
      }
    }
  }
}

// One column per pixel. Long recordings get up to three overlapping windows per column
// (the loudest wins) so short calls between the sampled positions are not skipped.
function analyseSonogram(samples: Float32Array, sampleRate: number) {
  const hzPerBin = sampleRate / FFT_SIZE
  const bins = Math.min(FFT_SIZE >> 1, Math.ceil(MAX_HZ / hzPerBin))
  const values = new Float32Array(FRAMES * bins)
  const real = new Float32Array(FFT_SIZE)
  const imaginary = new Float32Array(FFT_SIZE)
  const span = samples.length / FRAMES
  const windows = Math.min(3, Math.max(1, Math.ceil(span / FFT_SIZE)))
  const lastOffset = Math.max(0, samples.length - FFT_SIZE)
  let strongest = -Infinity
  for (let frame = 0; frame < FRAMES; frame++) {
    for (let part = 0; part < windows; part++) {
      const centre = (frame + (part + 0.5) / windows) * span
      const offset = Math.min(lastOffset, Math.max(0, Math.floor(centre - FFT_SIZE / 2)))
      for (let i = 0; i < FFT_SIZE; i++) real[i] = samples[offset + i] ?? 0
      spectrum(real, imaginary)
      for (let bin = 0; bin < bins; bin++) {
        const level = 20 * Math.log10(Math.hypot(real[bin], imaginary[bin]) + 0.00001)
        const index = frame * bins + bin
        if (part === 0 || level > values[index]) values[index] = level
        if (bin > 2 && level > strongest) strongest = level
      }
    }
  }

  const strengths = new Uint8Array(PLOT_WIDTH * PLOT_HEIGHT)
  const column = new Float32Array(FRAMES)
  for (let bin = 2; bin < bins; bin++) {
    for (let frame = 0; frame < FRAMES; frame++) column[frame] = values[frame * bins + bin]
    const sorted = Float32Array.from(column).sort()
    const floor = sorted[Math.floor(FRAMES * 0.25)]
    const peak = sorted[Math.floor(FRAMES * 0.98)]
    const threshold = Math.max(floor + 18, peak - 22, strongest - 35)
    const y = Math.floor((1 - (bin + 0.5) * hzPerBin / MAX_HZ) * PLOT_HEIGHT)
    if (y < 0 || y >= PLOT_HEIGHT) continue
    for (let frame = 0; frame < FRAMES; frame++) {
      const raw = Math.min(1, Math.max(0, (column[frame] - threshold) / 18))
      if (raw < 0.15) continue
      const value = Math.round(Math.pow((raw - 0.15) / 0.85, 1.1) * 255)
      const index = y * PLOT_WIDTH + frame
      if (value > strengths[index]) strengths[index] = value
    }
  }
  // 3x3 smoothing joins the broken dots of a call into lines; faint lone specks fade out.
  const smooth = new Uint8Array(strengths.length)
  for (let y = 1; y < PLOT_HEIGHT - 1; y++) {
    for (let x = 1; x < PLOT_WIDTH - 1; x++) {
      const i = y * PLOT_WIDTH + x
      const sum = 4 * strengths[i]
        + 2 * (strengths[i - 1] + strengths[i + 1] + strengths[i - PLOT_WIDTH] + strengths[i + PLOT_WIDTH])
        + strengths[i - PLOT_WIDTH - 1] + strengths[i - PLOT_WIDTH + 1] + strengths[i + PLOT_WIDTH - 1] + strengths[i + PLOT_WIDTH + 1]
      const value = Math.round(sum / 16 * 1.8) - 12
      smooth[i] = value < 0 ? 0 : value > 255 ? 255 : value
    }
  }
  return smooth
}

// The whole file is downloaded once per recording and shared by the sonogram and the player:
// xeno-canto does not support range requests, so streaming from its URL cannot seek.
const AUDIO_CACHE = new Map<string, Promise<Blob>>()

function loadAudio(id: string, url: string) {
  let pending = AUDIO_CACHE.get(id)
  if (!pending) {
    pending = fetch(url).then((response) => {
      if (!response.ok) throw new Error("Ljudet kunde inte hämtas")
      return response.blob()
    })
    pending.catch(() => AUDIO_CACHE.delete(id))
    AUDIO_CACHE.set(id, pending)
    if (AUDIO_CACHE.size > 6) AUDIO_CACHE.delete(AUDIO_CACHE.keys().next().value!)
  }
  return pending
}

const FALLBACK = { paper: "#faf7f0", rule: "#d9d0bf", ink: "#8f3509" }
let probe: CanvasRenderingContext2D | null = null

function rgb(color: string, fallback: string) {
  probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true })
  if (!probe) return [0, 0, 0]
  probe.canvas.width = probe.canvas.height = 1
  probe.fillStyle = fallback
  probe.fillStyle = color
  probe.clearRect(0, 0, 1, 1)
  probe.fillRect(0, 0, 1, 1)
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}

function paintSonogram(canvas: HTMLCanvasElement, strengths: Uint8Array) {
  const context = canvas.getContext("2d")
  if (!context) return
  const colors = getComputedStyle(canvas)
  const paperValue = colors.getPropertyValue("--surface").trim() || FALLBACK.paper
  const ruleValue = colors.getPropertyValue("--border").trim() || FALLBACK.rule
  const inkValue = colors.getPropertyValue("--accent-hover").trim() || FALLBACK.ink
  const paper = rgb(paperValue, FALLBACK.paper)
  const ink = rgb(inkValue, FALLBACK.ink)
  canvas.width = PLOT_WIDTH
  canvas.height = PLOT_HEIGHT
  const image = context.createImageData(PLOT_WIDTH, PLOT_HEIGHT)
  for (let i = 0; i < strengths.length; i++) {
    const mix = strengths[i] / 255 * 0.95
    const p = i * 4
    image.data[p] = paper[0] + (ink[0] - paper[0]) * mix
    image.data[p + 1] = paper[1] + (ink[1] - paper[1]) * mix
    image.data[p + 2] = paper[2] + (ink[2] - paper[2]) * mix
    image.data[p + 3] = 255
  }
  context.putImageData(image, 0, 0)
  context.strokeStyle = ruleValue
  context.globalAlpha = 0.55
  context.lineWidth = 1
  for (const khz of AXIS_KHZ) {
    const y = Math.round(PLOT_HEIGHT - khz * 1000 / MAX_HZ * PLOT_HEIGHT) + 0.5
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(PLOT_WIDTH, y)
    context.stroke()
  }
  context.globalAlpha = 1
}

function Sonogram({ recording, current, total, seek }: {
  recording: TempusSoundRecording
  current: number
  total: number
  seek: (event: React.MouseEvent<HTMLButtonElement>) => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<"loading" | "ready" | "fallback">("loading")
  const progress = total > 0 ? Math.min(100, Math.max(0, current / total * 100)) : 0

  const strengths = useRef<Uint8Array | null>(null)

  useEffect(() => {
    const target = canvas.current
    if (!target) return
    const cacheKey = String(recording.id)
    const cached = PLOT_CACHE.get(cacheKey)
    if (cached) {
      strengths.current = cached
      paintSonogram(target, cached)
      setState("ready")
      return
    }
    const controller = new AbortController()
    let active = true
    const render = async () => {
      try {
        const blob = await loadAudio(cacheKey, recording.audio_url)
        if (!active) return
        const audioContext = new AudioContext()
        try {
          const decoded = await audioContext.decodeAudioData(await blob.arrayBuffer())
          if (!active) return
          // Let "Ritar sonogram…" paint before the analysis blocks the thread.
          await new Promise((resolve) => setTimeout(resolve, 0))
          if (!active) return
          const result = analyseSonogram(decoded.getChannelData(0), decoded.sampleRate)
          PLOT_CACHE.set(cacheKey, result)
          if (PLOT_CACHE.size > 12) PLOT_CACHE.delete(PLOT_CACHE.keys().next().value!)
          strengths.current = result
          paintSonogram(target, result)
          setState("ready")
        } finally {
          void audioContext.close()
        }
      } catch {
        if (active) setState("fallback")
      }
    }
    void render()
    return () => { active = false; controller.abort() }
  }, [recording.id, recording.audio_url])

  // Repaint in the new colours when the theme changes.
  useEffect(() => {
    const repaint = () => {
      if (canvas.current && strengths.current) paintSonogram(canvas.current, strengths.current)
    }
    const observer = new MutationObserver(repaint)
    observer.observe(document.documentElement, { attributes: true })
    const scheme = window.matchMedia("(prefers-color-scheme: dark)")
    scheme.addEventListener("change", repaint)
    return () => { observer.disconnect(); scheme.removeEventListener("change", repaint) }
  }, [])

  return (
    <div>
      <div className="min-w-0">
        <button
          type="button"
          onClick={seek}
          aria-label="Hoppa till en tidpunkt i inspelningen"
          className="relative block h-40 w-full cursor-crosshair overflow-hidden border-y border-border bg-surface p-0 text-left transition-colors duration-150 hover:border-accent/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-48"
        >
          <canvas ref={canvas} aria-label={`Sonogram för XC${recording.id}`} className={`block h-full w-full transition-opacity duration-200 motion-reduce:transition-none ${state === "ready" ? "opacity-100" : "opacity-0"}`} />
          {state === "ready" ? (
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1 grid grid-rows-5 font-mono text-[9px] leading-none text-text-muted">
              {AXIS_KHZ.map((khz) => <span key={khz} className="self-end pb-px">{khz} kHz</span>)}
            </span>
          ) : null}
          {state === "ready" && current > 0 && total > 0 ? (
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px bg-accent/70" style={{ left: `${progress}%` }} />
          ) : null}
          {state === "loading" ? <span className="absolute inset-0 grid place-items-center text-xs italic text-text-muted">Ritar sonogram…</span> : null}
          {state === "fallback" ? <span className="absolute inset-0 grid place-items-center text-xs italic text-text-muted">Ljudet kunde inte avkodas för sonogrammet.</span> : null}
        </button>
        <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 font-mono text-[10px] text-text-muted">
          <span>0:00</span>
          <span aria-hidden="true" className="relative h-px bg-border">
            <span className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${progress}%` }} />
          </span>
          <span>{clock(total)}</span>
        </div>
      </div>
    </div>
  )
}

function Plate({ recording }: { recording: TempusSoundRecording }) {
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const audio = useRef<HTMLAudioElement>(null)
  const [source, setSource] = useState<string | null>(null)
  const total = Number.isFinite(duration) && duration > 0 ? duration : lengthSeconds(recording.length)

  useEffect(() => {
    let active = true
    let url = ""
    loadAudio(String(recording.id), recording.audio_url)
      .then((blob) => {
        if (!active) return
        url = URL.createObjectURL(blob)
        setSource(url)
      })
      .catch(() => { if (active) setSource(recording.audio_url) })
    return () => { active = false; if (url) URL.revokeObjectURL(url) }
  }, [recording.id, recording.audio_url])

  // timeupdate only fires a few times a second; follow the clock every frame while playing.
  useEffect(() => {
    if (!playing) return
    let frame = 0
    const tick = () => {
      if (audio.current) setCurrent(audio.current.currentTime)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing])

  const toggle = () => {
    const element = audio.current
    if (!element || !source) return
    if (element.paused) void element.play().catch(() => setPlaying(false))
    else element.pause()
  }
  const seek = (event: React.MouseEvent<HTMLButtonElement>) => {
    const element = audio.current
    if (!element || !total) return
    const box = event.currentTarget.getBoundingClientRect()
    element.currentTime = (event.clientX - box.left) / box.width * total
  }

  return (
    <div className="min-w-0">
      <audio ref={audio} src={source ?? undefined} preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} onDurationChange={(event) => setDuration(event.currentTarget.duration)} />
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h3 className="text-base font-medium">{soundName(recording.sound_type)}</h3>
          <p className="text-xs text-text-muted">{[placeName(recording), recording.recordist, recording.quality ? `Kvalitet ${recording.quality}` : ""].filter(Boolean).join(" · ")}</p>
        </div>
        <span className="font-mono text-[10px] text-text-muted">XC{recording.id}</span>
      </div>
      <Sonogram recording={recording} current={current} total={total} seek={seek} />
      <div className="mt-3 flex items-center justify-between gap-4 border-b border-border pb-3">
        <button type="button" onClick={toggle} disabled={!source} aria-label={playing ? "Pausa inspelningen" : "Spela upp inspelningen"} className="group inline-flex cursor-pointer items-center disabled:cursor-wait disabled:opacity-50 gap-2.5 text-xs text-text transition-colors duration-150 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          <span className="grid size-8 place-items-center rounded-full bg-accent text-surface transition-[background-color,transform] duration-150 group-hover:bg-accent-hover group-active:scale-95 motion-reduce:transition-none">
            {playing ? <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3 fill-current"><path d="M3 2h3v12H3zm7 0h3v12h-3z" /></svg> : <svg aria-hidden="true" viewBox="0 0 16 16" className="ml-0.5 size-3 fill-current"><path d="M4 2.2v11.6L13 8z" /></svg>}
          </span>
          <span>{playing ? "Pausa" : "Spela upp"}</span>
        </button>
        <span className="font-mono text-[11px] tabular-nums text-text-muted">{clock(current)} / {clock(total)}</span>
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs italic text-text-muted">
        {recording.page_url ? <a href={recording.page_url} target="_blank" rel="noreferrer" className="underline decoration-border underline-offset-4 transition-colors duration-150 hover:text-accent">Inspelning XC{recording.id} ↗</a> : null}
        {recording.licence_url ? <a href={recording.licence_url} target="_blank" rel="noreferrer" className="underline decoration-border underline-offset-4 transition-colors duration-150 hover:text-accent">Licens {licenceCode(recording.licence_url)}</a> : null}
      </p>
    </div>
  )
}

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
