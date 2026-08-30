"use client"

import { useMemo, useState } from "react"
import { Card } from "@/app/components/ui/Card"
import { useBirdnetStream, type BirdnetDetection } from "@/app/lib/birdnet-live"
import type { BirdnetDevice } from "@/app/lib/dal"

function formatTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "–"
    : date.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function formatDay(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("sv-SE", { day: "numeric", month: "short" })
}

function formatRelative(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "–"
  const diffMs = Date.now() - date.getTime()
  const min = Math.round(diffMs / 60000)
  if (min < 1) return "nyss"
  if (min < 60) return `${min} min sedan`
  const hours = Math.round(min / 60)
  if (hours < 24) return `${hours} h sedan`
  return `${formatDay(value)} ${formatTime(value)}`
}

function capitalize(value: string) {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1)
}

// Swedish common name when Dyntaxa matched it, otherwise the raw BirdNET label.
function displayName(detection: BirdnetDetection) {
  const swedish = detection.matched_species?.swedish_name
  return swedish ? capitalize(swedish) : detection.species
}

// Scientific name to show as a secondary line — omitted when it's identical to
// what displayName already shows.
function scientificName(detection: BirdnetDetection) {
  const scientific = detection.matched_species?.scientific_name ?? detection.species
  return detection.matched_species?.swedish_name ? scientific : null
}

// Stable grouping key — the resolved taxon if we have one, else the raw label.
function speciesKey(detection: BirdnetDetection) {
  return detection.matched_species?.scientific_name ?? detection.species
}

type SpeciesGroup = {
  key: string
  name: string
  scientific: string | null
  count: number
  lastDetectedAt: string
  bestConfidence: number
  devices: Set<string>
}

function groupBySpecies(detections: BirdnetDetection[]): SpeciesGroup[] {
  const map = new Map<string, SpeciesGroup>()
  for (const d of detections) {
    const existing = map.get(speciesKey(d))
    if (existing) {
      existing.count += 1
      existing.devices.add(d.device_id)
      if (d.confidence > existing.bestConfidence) existing.bestConfidence = d.confidence
      if (new Date(d.detectedAt).getTime() > new Date(existing.lastDetectedAt).getTime()) {
        existing.lastDetectedAt = d.detectedAt
      }
    } else {
      map.set(speciesKey(d), {
        key: speciesKey(d),
        name: displayName(d),
        scientific: scientificName(d),
        count: 1,
        lastDetectedAt: d.detectedAt,
        bestConfidence: d.confidence,
        devices: new Set([d.device_id]),
      })
    }
  }
  return [...map.values()].sort(
    (a, b) => new Date(b.lastDetectedAt).getTime() - new Date(a.lastDetectedAt).getTime()
  )
}

function SpeciesRow({
  group,
  deviceNames,
}: {
  group: SpeciesGroup
  deviceNames: Map<string, string>
}) {
  const pct = Math.round(group.bestConfidence * 100)
  const deviceLabel = [...group.devices]
    .map((id) => deviceNames.get(id) ?? id)
    .join(", ")
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1.5fr)_minmax(8rem,0.7fr)_4rem_4rem] sm:px-5">
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-text">{group.name}</span>
        <span className="block truncate text-xs text-text-faint">
          {group.scientific ? <span className="italic">{group.scientific}</span> : null}
          {group.scientific ? " · " : null}
          <span className="font-mono uppercase tracking-wide">{deviceLabel}</span>
        </span>
      </span>
      <span className="font-mono text-[11px] text-text-muted">{formatRelative(group.lastDetectedAt)}</span>
      <span
        className="justify-self-start rounded-full bg-surface-2 px-2 py-0.5 font-mono text-xs tabular-nums text-text-muted"
        title={`${group.count} detektioner`}
      >
        ×{group.count}
      </span>
      <span className="hidden font-mono text-xs tabular-nums text-text-muted sm:block">{pct}%</span>
    </li>
  )
}

function DetectionRow({
  detection,
  deviceName,
}: {
  detection: BirdnetDetection
  deviceName: string
}) {
  const pct = Math.round(detection.confidence * 100)
  const scientific = scientificName(detection)
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1.5fr)_minmax(7rem,0.7fr)_5rem_5.5rem] sm:px-5">
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-text">{displayName(detection)}</span>
        <span className="block truncate text-xs text-text-faint">
          {scientific ? <span className="italic">{scientific}</span> : null}
          {scientific ? " · " : null}
          <span className="font-mono uppercase tracking-wide">{deviceName}</span>
        </span>
      </span>
      <span className="hidden font-mono text-[11px] text-text-muted sm:block">
        {formatDay(detection.detectedAt)} {formatTime(detection.detectedAt)}
      </span>
      <span className="font-mono text-xs tabular-nums text-text-muted">{pct}%</span>
      <span
        className="hidden h-1.5 rounded-full bg-surface-2 sm:block"
        role="img"
        aria-label={`Säkerhet ${pct} procent`}
      >
        <span
          className="block h-full rounded-full bg-accent"
          style={{ width: `${Math.max(pct, 4)}%` }}
        />
      </span>
    </li>
  )
}

type View = "species" | "all"

export default function BirdnetLiveFeed({ devices }: { devices: BirdnetDevice[] }) {
  const activeDevices = devices.filter((device) => device.is_active)
  const [view, setView] = useState<View>("species")
  const { detections, connected } = useBirdnetStream({
    replaySeconds: 86400,
    enabled: activeDevices.length > 0,
  })

  const deviceNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const device of devices) map.set(device.identifier, device.name)
    return map
  }, [devices])

  const speciesGroups = useMemo(() => groupBySpecies(detections), [detections])

  const tabClass = (active: boolean) =>
    `rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors ${
      active ? "bg-text text-surface" : "border border-border text-text-faint hover:text-text-muted"
    }`

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-text-faint">BirdNET · ström</p>
          <h2 className="mt-1 font-display text-xl font-semibold">Detektioner live</h2>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wide ${
            connected ? "border-success/40 text-success" : "border-border text-text-faint"
          }`}
        >
          <span
            className={`size-2 rounded-full ${connected ? "animate-pulse bg-success" : "bg-text-faint"}`}
          />
          {connected ? "Ansluten" : "Inte ansluten"}
        </span>
      </div>

      {activeDevices.length === 0 ? (
        <Card className="border-dashed px-6 py-10 text-center">
          <p className="font-display text-lg font-semibold">Ingen aktiv enhet</p>
          <p className="mt-2 text-sm text-text-muted">
            Aktivera minst en BirdNET-enhet nedan för att ta emot detektioner.
          </p>
        </Card>
      ) : detections.length === 0 ? (
        <Card className="border-dashed px-6 py-10 text-center">
          <p className="font-display text-lg font-semibold">Väntar på fåglar</p>
          <p className="mt-2 text-sm text-text-muted">
            Inga detektioner de senaste 24 timmarna. Nya dyker upp här automatiskt.
          </p>
        </Card>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setView("species")} className={tabClass(view === "species")}>
              Arter · {speciesGroups.length}
            </button>
            <button type="button" onClick={() => setView("all")} className={tabClass(view === "all")}>
              Alla · {detections.length}
            </button>
          </div>
          <Card className="overflow-hidden p-0">
            <ul className="max-h-[28rem] overflow-y-auto">
              {view === "species"
                ? speciesGroups.map((group) => (
                    <SpeciesRow key={group.key} group={group} deviceNames={deviceNames} />
                  ))
                : detections.map((detection) => (
                    <DetectionRow
                      key={detection.id}
                      detection={detection}
                      deviceName={deviceNames.get(detection.device_id) ?? detection.device_id}
                    />
                  ))}
            </ul>
          </Card>
        </>
      )}
    </section>
  )
}
