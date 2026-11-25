"use client"

import { useEffect, useRef, useState } from "react"
import type { TempusSoundRecording } from "@/app/lib/dal"

const licenceCode = (url: string) => {
  if (url.includes("/publicdomain/zero/")) return "CC0"
  const match = /licenses\/([^/]+)\//.exec(url)
  return match ? match[1].toUpperCase() : ""
}

export const clock = (seconds: number) => {
  const whole = Math.max(0, Math.floor(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`
}

export const lengthSeconds = (length: string) => {
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

export const soundName = (type: string) => {
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

export const placeName = (recording: TempusSoundRecording) => {
  const place = recording.country || recording.location
  return countryNames[place] ?? place ?? "Okänd lokal"
}

// Reuse the window and FFT phases for every time slice of a recording.
const FFT_SIZE = 2048
export const PLOT_WIDTH = 1200
export const PLOT_HEIGHT = 256
const FRAMES = PLOT_WIDTH
// A recording sampled above 48 kHz holds ultrasound (a bat).
const AUDIBLE_LIMIT_HZ = 24000
export const DEFAULT_RANGE = { minHz: 0, maxHz: 10000 }

/**
 * What a sonogram is: the signal strength 0-255 of every pixel, and the frequencies at the bottom and the top
 * of the picture. The range is chosen from where the sound is, so a frog and a bat each fill their own picture.
 */
export type SonogramData = { strengths: Uint8Array; minHz: number; maxHz: number }

/** The frequencies in kHz that get a line, for a sonogram that reaches from `minHz` to `maxHz`. */
export function axisKhz(minHz: number, maxHz: number) {
  const minKhz = minHz / 1000
  const maxKhz = maxHz / 1000
  const step = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50].find((candidate) => (maxKhz - minKhz) / candidate <= 7) ?? 100
  const marks: number[] = []
  for (let n = Math.ceil(minKhz / step); n * step < maxKhz; n++) {
    const khz = Math.round(n * step * 1000) / 1000
    if (khz > minKhz + step / 4 && khz < maxKhz - step / 4) marks.push(khz)
  }
  return marks
}

/** The lines that also get a label; every other one when there are many, so the labels fit a small sonogram. */
export const labelledKhz = (minHz: number, maxHz: number) => {
  const marks = axisKhz(minHz, maxHz)
  return marks.length > 4 ? marks.filter((_, index) => index % 2 === 1) : marks
}

/** Where a frequency sits in the picture, as a share of its height from the bottom. */
export const heightShare = (khz: number, minHz: number, maxHz: number) => (khz * 1000 - minHz) / (maxHz - minHz)

// Per recording, so a theme change only needs a repaint.
const PLOT_CACHE = new Map<string, SonogramData>()
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
function analyseSonogram(samples: Float32Array, sampleRate: number): SonogramData {
  const hzPerBin = sampleRate / FFT_SIZE
  const nyquist = sampleRate / 2
  const ultrasonic = nyquist > AUDIBLE_LIMIT_HZ
  const bins = FFT_SIZE >> 1
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

  // First every frequency's own threshold, and how much of the sound lies at it.
  const thresholds = new Float32Array(bins)
  const activity = new Float32Array(bins)
  const column = new Float32Array(FRAMES)
  let total = 0
  for (let bin = 2; bin < bins; bin++) {
    for (let frame = 0; frame < FRAMES; frame++) column[frame] = values[frame * bins + bin]
    const sorted = Float32Array.from(column).sort()
    const floor = sorted[Math.floor(FRAMES * 0.25)]
    const peak = sorted[Math.floor(FRAMES * 0.98)]
    thresholds[bin] = Math.max(floor + 18, peak - 22, strongest - 35)
    for (let frame = 0; frame < FRAMES; frame++) if ((column[frame] - thresholds[bin]) / 18 >= 0.15) activity[bin] += 1
    total += activity[bin]
  }

  // The picture is centred on the sound: from where the first five percent of it lies to where the last five end,
  // with room around it, and never narrower than a minimum so a pure tone is not stretched across everything.
  let lowBin = 2
  let highBin = Math.min(bins - 1, Math.ceil((ultrasonic ? nyquist : DEFAULT_RANGE.maxHz) / hzPerBin))
  if (total > 0) {
    let run = 0
    for (let bin = 2; bin < bins; bin++) {
      run += activity[bin]
      if (run >= total * 0.05) { lowBin = bin; break }
    }
    run = 0
    for (let bin = bins - 1; bin >= 2; bin--) {
      run += activity[bin]
      if (run >= total * 0.05) { highBin = bin; break }
    }
  }
  const signalLow = lowBin * hzPerBin
  const signalHigh = (highBin + 1) * hzPerBin
  const padding = (signalHigh - signalLow) * 0.3
  const narrowest = ultrasonic ? 10000 : 2000
  let minHz = Math.max(0, signalLow - padding)
  let maxHz = Math.min(nyquist, signalHigh + padding)
  if (maxHz - minHz < narrowest) {
    maxHz = Math.min(nyquist, (minHz + maxHz) / 2 + narrowest / 2)
    minHz = Math.max(0, maxHz - narrowest)
    maxHz = Math.min(nyquist, minHz + narrowest)
  }

  // Then every frequency is painted over the rows it covers, so a narrow range has no gaps between its lines.
  const range = maxHz - minHz
  const strengths = new Uint8Array(PLOT_WIDTH * PLOT_HEIGHT)
  for (let bin = 2; bin < bins; bin++) {
    const low = bin * hzPerBin
    const high = (bin + 1) * hzPerBin
    if (high <= minHz || low >= maxHz) continue
    const top = Math.max(0, Math.floor((1 - (Math.min(high, maxHz) - minHz) / range) * PLOT_HEIGHT))
    const bottom = Math.min(PLOT_HEIGHT - 1, Math.max(top, Math.ceil((1 - (Math.max(low, minHz) - minHz) / range) * PLOT_HEIGHT) - 1))
    for (let frame = 0; frame < FRAMES; frame++) {
      const raw = Math.min(1, Math.max(0, (values[frame * bins + bin] - thresholds[bin]) / 18))
      if (raw < 0.15) continue
      const value = Math.round(Math.pow((raw - 0.15) / 0.85, 1.1) * 255)
      for (let y = top; y <= bottom; y++) {
        const index = y * PLOT_WIDTH + frame
        if (value > strengths[index]) strengths[index] = value
      }
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
      // A bat call is a few milliseconds long, one thin tick; smoothing alone would fade it away.
      const kept = ultrasonic ? Math.max(value, strengths[i]) : value
      smooth[i] = kept < 0 ? 0 : kept > 255 ? 255 : kept
    }
  }
  if (ultrasonic) {
    // At six seconds across, a call of a few milliseconds is a single column; making it three wide keeps it visible.
    const widened = new Uint8Array(smooth.length)
    for (let i = 1; i < smooth.length - 1; i++) widened[i] = Math.max(smooth[i - 1], smooth[i], smooth[i + 1])
    return { strengths: widened, minHz, maxHz }
  }
  return { strengths: smooth, minHz, maxHz }
}

/** The sampling rate of a WAV file, or null for any other kind of file. */
function wavSampleRate(buffer: ArrayBuffer) {
  if (buffer.byteLength < 28) return null
  const view = new DataView(buffer)
  const tag = (offset: number) => String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3))
  return tag(0) === "RIFF" && tag(8) === "WAVE" ? view.getUint32(24, true) : null
}

// The whole file is downloaded once per recording and shared by the sonogram and the player:
// xeno-canto does not support range requests, so streaming from its URL cannot seek.
const AUDIO_CACHE = new Map<string, Promise<Blob>>()

function loadAudio(id: string, url: string) {
  let pending = AUDIO_CACHE.get(id)
  if (!pending) {
    // Xeno-canto sends no ETag and asks for revalidation, so a plain fetch downloads the whole file again
    // every time. A recording never changes under its number, so the browser's own copy is used when it has one.
    pending = fetch(url, { cache: "force-cache" }).then((response) => {
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

/** Paints one recording as a single ink on a transparent ground, so several can be laid over each other. */
export function paintInk(canvas: HTMLCanvasElement, strengths: Uint8Array, ink: string) {
  const context = canvas.getContext("2d")
  if (!context) return
  const inkValue = getComputedStyle(canvas).getPropertyValue(ink).trim() || FALLBACK.ink
  const [r, g, b] = rgb(inkValue, FALLBACK.ink)
  canvas.width = PLOT_WIDTH
  canvas.height = PLOT_HEIGHT
  const image = context.createImageData(PLOT_WIDTH, PLOT_HEIGHT)
  for (let i = 0; i < strengths.length; i++) {
    const p = i * 4
    image.data[p] = r
    image.data[p + 1] = g
    image.data[p + 2] = b
    image.data[p + 3] = Math.round(strengths[i] * 0.95)
  }
  context.putImageData(image, 0, 0)
}

const PLOT_PENDING = new Map<string, Promise<SonogramData>>()

/** The sonogram of a recording, downloaded and analysed once however many views ask for them. */
export function loadStrengths(recording: TempusSoundRecording): Promise<SonogramData> {
  const key = String(recording.id)
  const cached = PLOT_CACHE.get(key)
  if (cached) return Promise.resolve(cached)
  let pending = PLOT_PENDING.get(key)
  if (!pending) {
    pending = (async () => {
      const blob = await loadAudio(key, recording.audio_url)
      const data = await blob.arrayBuffer()
      // The browser resamples what it decodes to the rate of its audio context, which would cut away an
      // ultrasonic recording above 24 kHz; so the context is made to run at the file's own rate.
      const fileRate = wavSampleRate(data)
      let audioContext: AudioContext
      try {
        audioContext = fileRate ? new AudioContext({ sampleRate: fileRate }) : new AudioContext()
      } catch {
        audioContext = new AudioContext()
      }
      try {
        const decoded = await audioContext.decodeAudioData(data)
        // Let "Ritar sonogram…" paint before the analysis blocks the thread.
        await new Promise((resolve) => setTimeout(resolve, 0))
        const result = analyseSonogram(decoded.getChannelData(0), decoded.sampleRate)
        PLOT_CACHE.set(key, result)
        if (PLOT_CACHE.size > 12) PLOT_CACHE.delete(PLOT_CACHE.keys().next().value!)
        return result
      } finally {
        void audioContext.close()
      }
    })()
    const forget = () => { PLOT_PENDING.delete(key) }
    pending.then(forget, forget)
    PLOT_PENDING.set(key, pending)
  }
  return pending
}

function paintSonogram(canvas: HTMLCanvasElement, { strengths, minHz, maxHz }: SonogramData, inkVar: string) {
  const context = canvas.getContext("2d")
  if (!context) return
  const colors = getComputedStyle(canvas)
  const paperValue = colors.getPropertyValue("--surface").trim() || FALLBACK.paper
  const ruleValue = colors.getPropertyValue("--border").trim() || FALLBACK.rule
  const inkValue = colors.getPropertyValue(inkVar).trim() || FALLBACK.ink
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
  for (const khz of axisKhz(minHz, maxHz)) {
    const y = Math.round(PLOT_HEIGHT - heightShare(khz, minHz, maxHz) * PLOT_HEIGHT) + 0.5
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(PLOT_WIDTH, y)
    context.stroke()
  }
  context.globalAlpha = 1
}

function Sonogram({ recording, current, total, seek, compact, ink }: {
  recording: TempusSoundRecording
  current: number
  total: number
  seek: (event: React.MouseEvent<HTMLButtonElement>) => void
  compact: boolean
  ink: string
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<"loading" | "ready" | "fallback">("loading")
  const progress = total > 0 ? Math.min(100, Math.max(0, current / total * 100)) : 0

  const strengths = useRef<SonogramData | null>(null)
  const [range, setRange] = useState(DEFAULT_RANGE)

  useEffect(() => {
    const target = canvas.current
    if (!target) return
    let active = true
    loadStrengths(recording)
      .then((result) => {
        if (!active) return
        strengths.current = result
        setRange({ minHz: result.minHz, maxHz: result.maxHz })
        paintSonogram(target, result, ink)
        setState("ready")
      })
      .catch(() => { if (active) setState("fallback") })
    return () => { active = false }
  }, [recording, ink])

  // Repaint in the new colours when the theme changes.
  useEffect(() => {
    const repaint = () => {
      if (canvas.current && strengths.current) paintSonogram(canvas.current, strengths.current, ink)
    }
    const observer = new MutationObserver(repaint)
    observer.observe(document.documentElement, { attributes: true })
    const scheme = window.matchMedia("(prefers-color-scheme: dark)")
    scheme.addEventListener("change", repaint)
    return () => { observer.disconnect(); scheme.removeEventListener("change", repaint) }
  }, [ink])

  return (
    <div>
      <div className="min-w-0">
        <button
          type="button"
          onClick={seek}
          aria-label="Hoppa till en tidpunkt i inspelningen"
          className={`relative block w-full cursor-crosshair overflow-hidden border-y border-border bg-surface p-0 text-left transition-colors duration-150 hover:border-accent/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${compact ? "h-28 sm:h-36" : "h-40 sm:h-48"}`}
        >
          <canvas ref={canvas} aria-label={`Sonogram för XC${recording.id}`} className={`block h-full w-full transition-opacity duration-200 motion-reduce:transition-none ${state === "ready" ? "opacity-100" : "opacity-0"}`} />
          {state === "ready" ? (
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1 font-mono text-[9px] leading-none text-text-muted">
              {labelledKhz(range.minHz, range.maxHz).map((khz) => <span key={khz} className="absolute left-0 whitespace-nowrap pb-px" style={{ bottom: `${heightShare(khz, range.minHz, range.maxHz) * 100}%` }}>{khz} kHz</span>)}
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

export function Plate({ recording, compact = false, ink = "--accent-hover", hideSonogram = false, onProgress }: {
  recording: TempusSoundRecording
  compact?: boolean
  /** The CSS variable of the colour the sonogram is drawn in. */
  ink?: string
  hideSonogram?: boolean
  /** Told where the playback is, for a view that draws the playhead elsewhere. */
  onProgress?: (current: number, playing: boolean) => void
}) {
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const audio = useRef<HTMLAudioElement>(null)
  const [source, setSource] = useState<string | null>(null)
  const total = Number.isFinite(duration) && duration > 0 ? duration : lengthSeconds(recording.length)
  const progress = useRef(onProgress)
  useEffect(() => { progress.current = onProgress })
  useEffect(() => { progress.current?.(current, playing) }, [current, playing])

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
      {hideSonogram ? null : <Sonogram recording={recording} current={current} total={total} seek={seek} compact={compact} ink={ink} />}
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
