"use client"

import { useState } from "react"
import { Card } from "@/app/components/ui/Card"
import { Chip } from "@/app/components/ui/Chip"
import { Icon } from "@/app/components/ui/Icon"
import { species } from "./species-data"
import { BiotopeMap, SwedenMap } from "./ui/biotope-map"

function hashSpecies(value: string) {
  return [...value].reduce((hash, character) => {
    return Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0
  }, 2166136261)
}

function seededRandom(seed: number) {
  let state = seed

  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function closedContourPath(
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  wobble: number,
) {
  const points = Array.from({ length: 16 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2
    const horizontalWarp =
      1 + Math.sin(angle * 3 + wobble) * 0.11 + Math.cos(angle * 2 - wobble * 0.6) * 0.06
    const verticalWarp =
      1 + Math.cos(angle * 2.4 + wobble * 0.8) * 0.09 + Math.sin(angle * 4 - wobble) * 0.04

    return [
      centerX + Math.cos(angle) * radiusX * horizontalWarp,
      centerY + Math.sin(angle) * radiusY * verticalWarp + Math.cos(angle * 3 + wobble) * 1.4,
    ]
  })

  const midpoint = (first: number[], second: number[]) => [
    (first[0] + second[0]) / 2,
    (first[1] + second[1]) / 2,
  ]
  const start = midpoint(points.at(-1)!, points[0])

  return `${`M ${start[0].toFixed(1)} ${start[1].toFixed(1)}`} ${points
    .map((point, index) => {
      const next = points[(index + 1) % points.length]
      const end = midpoint(point, next)
      return `Q ${point[0].toFixed(1)} ${point[1].toFixed(1)} ${end[0].toFixed(1)} ${end[1].toFixed(1)}`
    })
    .join(" ")} Z`
}

type Landform = "field" | "hill" | "valley"

function SpeciesTopography({
  speciesName,
  habitat,
  baseOnly = false,
  showGrid = false,
  landform = "hill",
}: {
  speciesName: string
  habitat: string
  baseOnly?: boolean
  showGrid?: boolean
  landform?: Landform
}) {
  const seed = hashSpecies(speciesName)
  const random = seededRandom(seed)
  const normalizedHabitat = habitat.toLocaleLowerCase("sv")
  const fieldHabitat = !baseOnly && /äng|betesmark|åker|fält|hed|vägkant/.test(normalizedHabitat)
  const valleyHabitat = !baseOnly && /dal|ravin|sänka|dalgång/.test(normalizedHabitat)
  const forestHabitat = !baseOnly && /skog|barr|tall|träd/.test(normalizedHabitat)
  const fogHabitat = !baseOnly && /fukt|dimma|dis|våt|kärr|mosse/.test(normalizedHabitat)
  const coastalHabitat = !baseOnly && /strand|hav|kustlinje/.test(normalizedHabitat)
  const lakeHabitat = !baseOnly && /sjö|tjärn|damm|kustnära/.test(normalizedHabitat)
  const riverHabitat = !baseOnly && /bäck|flod|älv|vattendrag|åmynning|(?:^|[\s·])å(?:$|[\s·])/.test(normalizedHabitat) && !lakeHabitat
  const clusterCount = baseOnly || fieldHabitat ? 1 : 2
  const contourClusters = Array.from({ length: clusterCount }, (_, clusterIndex) => {
    const lineCount = baseOnly ? (landform === "field" ? 5 : 10) : fieldHabitat ? 6 : valleyHabitat ? 8 : 7
    const centerX = baseOnly ? (landform === "field" ? 174 : 162) : clusterIndex === 0 ? 132 + random() * 20 : 155 + random() * 12
    const centerY = baseOnly ? (landform === "field" ? 48 : 58) : clusterIndex === 0 ? 24 + random() * 22 : 68 + random() * 18
    const baseWidth = baseOnly ? (landform === "field" ? 35 : 16) : fieldHabitat ? 30 : 17 + random() * 6
    const baseHeight = baseOnly ? (landform === "field" ? 14 : 7) : fieldHabitat ? 14 : 8 + random() * 4
    const horizontalStep = baseOnly ? (landform === "field" ? 18 : 7.2) : fieldHabitat ? 13 : 6.5
    const verticalStep = baseOnly ? (landform === "field" ? 10 : 4.2) : fieldHabitat ? 7 : 4.1

    return {
      centerX,
      centerY,
      outerPath: closedContourPath(
        centerX,
        centerY,
        baseWidth + (lineCount - 1) * horizontalStep,
        baseHeight + (lineCount - 1) * verticalStep,
        seed * 0.0001 + clusterIndex,
      ),
      paths: Array.from({ length: lineCount }, (_, index) =>
        closedContourPath(
          centerX + (baseOnly ? index * 0.65 : 0),
          centerY + (baseOnly ? Math.sin(index * 0.8) * 1.4 : 0),
          baseWidth + index * horizontalStep,
          baseHeight + index * verticalStep,
          seed * 0.0001 + clusterIndex * 2 + index * 0.42,
        ),
      ),
    }
  })
  const waterY = 25 + random() * 30
  const valleyPaths = [-1, 1].flatMap((side, sideIndex) =>
    Array.from({ length: 6 }, (_, index) =>
      closedContourPath(
        151 + Math.sin(index * 0.7) * 2,
        side < 0 ? -9 : 109,
        22 + index * 8.5,
        14 + index * 5.5,
        seed * 0.0001 + sideIndex * 3 + index * 0.46,
      ),
    ),
  )

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      viewBox="0 0 160 100"
    >
      <defs>
        <linearGradient id={`map-fade-${seed}`} x1="0" x2="1">
          <stop offset="0" stopColor="black" />
          <stop offset="0.32" stopColor="black" />
          <stop offset="0.5" stopColor="white" stopOpacity="0.3" />
          <stop offset="0.7" stopColor="white" stopOpacity="0.82" />
          <stop offset="1" stopColor="white" />
        </linearGradient>
        <mask id={`map-mask-${seed}`}>
          <rect width="160" height="100" fill={`url(#map-fade-${seed})`} />
        </mask>
        <radialGradient id={`paper-wash-${seed}`} cx="82%" cy="42%" r="58%">
          <stop offset="0" stopColor="#8b5b31" stopOpacity="0.055" />
          <stop offset="0.65" stopColor="#8b5b31" stopOpacity="0.018" />
          <stop offset="1" stopColor="#8b5b31" stopOpacity="0" />
        </radialGradient>
        <pattern id={`map-grid-${seed}`} width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M 12 0 H 0 V 12" fill="none" stroke="var(--accent)" strokeOpacity="0.075" strokeWidth="0.3" />
        </pattern>
        <filter id={`fog-blur-${seed}`} x="-15%" y="-30%" width="130%" height="160%">
          <feGaussianBlur stdDeviation="3.4" />
        </filter>
      </defs>
      <rect width="160" height="100" fill={`url(#paper-wash-${seed})`} />
      <g mask={`url(#map-mask-${seed})`}>
        {showGrid && (
          <>
            <rect x="76" width="84" height="100" fill={`url(#map-grid-${seed})`} />
            {baseOnly && (
              <g stroke="var(--accent)" strokeOpacity="0.1" strokeWidth="0.42">
                <path d="M 100 0 V 100 M 124 0 V 100 M 148 0 V 100" />
                <path d="M 76 24 H 160 M 76 48 H 160 M 76 72 H 160 M 76 96 H 160" />
              </g>
            )}
          </>
        )}
        {forestHabitat && contourClusters.map((cluster, index) => (
          <path key={`terrain-${index}`} d={cluster.outerPath} fill="var(--secondary)" fillOpacity="0.035" />
        ))}
        <g fill="none" stroke="var(--accent)" strokeLinecap="round" strokeLinejoin="round" strokeWidth={fieldHabitat ? 0.38 : 0.48}>
          {(baseOnly && landform === "valley" ? [{ paths: valleyPaths }] : contourClusters).flatMap((cluster, clusterIndex) =>
            cluster.paths.map((path, index) => (
              <path
                key={`${clusterIndex}-${index}`}
                d={path}
                strokeOpacity={index % 4 === 0 ? 0.22 : 0.14}
                strokeDasharray={index === cluster.paths.length - 1 ? "42 1.5 24 1" : undefined}
              />
            )),
          )}
          {valleyHabitat && Array.from({ length: 4 }, (_, index) => (
            <path key={`valley-${index}`} d={`M ${92 + index * 5} 2 C ${108 + index * 3} 22, ${106 + index * 2} 37, ${124 + index} 50 C ${106 + index * 2} 63, ${108 + index * 3} 78, ${92 + index * 5} 98`} />
          ))}
        </g>
        {riverHabitat && (
          <path d={`M 94 ${waterY} C 111 ${waterY - 8}, 119 ${waterY + 12}, 134 ${waterY + 5} S 151 ${waterY - 7}, 166 ${waterY + 2}`} fill="none" stroke="var(--secondary)" strokeLinecap="round" strokeOpacity="0.22" strokeWidth="0.75" />
        )}
        {lakeHabitat && (
          <path d="M 126 19 C 138 13, 154 17, 162 27 C 158 37, 144 42, 132 38 C 123 34, 120 25, 126 19 Z" fill="var(--secondary)" fillOpacity="0.09" stroke="var(--secondary)" strokeOpacity="0.34" strokeWidth="0.58" />
        )}
        {coastalHabitat && (
          <path d="M 144 -5 C 132 17, 151 28, 139 48 C 131 63, 151 79, 142 105" fill="none" stroke="var(--secondary)" strokeOpacity="0.22" strokeWidth="0.8" />
        )}
        {fogHabitat && (
          <g filter={`url(#fog-blur-${seed})`} fill="none" stroke="var(--surface)" strokeLinecap="round">
            <path d="M 80 34 C 103 23, 122 42, 166 28" strokeOpacity="0.86" strokeWidth="11" />
            <path d="M 88 66 C 112 53, 136 72, 169 57" strokeOpacity="0.78" strokeWidth="9" />
          </g>
        )}
      </g>
    </svg>
  )
}

const scopes = [
  { id: "position", label: "Nuvarande plats" },
  { id: "route", label: "Planerad rutt" },
  { id: "region", label: "Landskap" },
] as const

type Scope = (typeof scopes)[number]["id"]

const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]

const scopeCopy: Record<Scope, { context: string; title: string; meta: string; count: string }> = {
  route: {
    context: "Malmö → Kivik · 30 augusti 2026",
    title: "Ruttöversikt",
    meta: "126 km · 3 stopp · 5 km sökkorridor",
    count: "7 / 9",
  },
  position: {
    context: "55.6050° N, 13.0038° E · 27 augusti 2026",
    title: "Säsongsöversikt",
    meta: "25 km radie · position uppdaterad 06:28",
    count: "5 / 9",
  },
  region: {
    context: "Skåne · 27 augusti 2026 · vecka 35",
    title: "Säsongsöversikt",
    meta: "Hela landskapet · uppdaterad 06:30",
    count: "4 / 9",
  },
}

// Real weekly-activity data, keyed by scientific name, is resolved server-side
// in `page.tsx` from each species' phenogram and passed in here; species with
// no phenogram fall back to the illustrative `active` months on the mock.
export default function Home({ activity }: { activity?: Record<string, number[]> }) {
  const [scope, setScope] = useState<Scope>("route")
  const copy = scopeCopy[scope]

  return (
    <div className="container flex w-full flex-col gap-8 py-6">
      <section className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[10px] uppercase tracking-wide text-text-faint">
          Analysera för
        </span>
        {scopes.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setScope(item.id)}
            className={`rounded border px-3 py-2 font-mono text-xs ${scope === item.id
              ? "border-text bg-text text-bg"
              : "border-border bg-surface text-text hover:border-border-strong"
              }`}
          >
            {item.label}
          </button>
        ))}
      </section>
      
      <section className="grid gap-3 lg:grid-cols-[1fr_250px]">
        <Card
          className="relative min-h-40 overflow-hidden border-l-4 border-l-accent shadow-sm"
          style={{
            backgroundImage:
              "repeating-radial-gradient(ellipse at 92% 45%, transparent 0 20px, var(--topography-line) 21px 22px, transparent 23px 31px)",
          }}
        >
          <div className="relative z-10 flex h-full flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-accent">{copy.context}</p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-text">
                {copy.title}
              </h1>
            </div>
            <p className="text-sm text-text-muted">{copy.meta}</p>
          </div>
        </Card>
        <Card className="flex min-h-40 flex-col justify-between bg-text text-bg shadow-sm">
          <span className="font-mono text-xs uppercase tracking-wide text-bg/70">Aktuella av följda</span>
          <strong className="font-display text-3xl font-semibold">{copy.count}</strong>
          <span className="text-sm text-bg/70">4 pågående · 3 inkommande</span>
        </Card>
      </section>

      {scope === "route" && (
        <Card className="grid gap-4 shadow-sm sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
          <div className="flex items-center gap-3">
            <span className="size-2.5 rounded-full border-2 border-accent" />
            <div>
              <strong className="font-display">Malmö → Kivik</strong>
              <p className="mt-1 font-mono text-xs text-text-muted">Start 07:30 · via 3 stopp · 126 km</p>
            </div>
          </div>
          <div className="border-l border-border pl-4">
            <span className="block font-mono text-[10px] uppercase text-text-faint">Sökkorridor</span>
            <strong className="text-sm">5 km</strong>
          </div>
          <div className="border-l border-border pl-4">
            <span className="block font-mono text-[10px] uppercase text-text-faint">Datum</span>
            <strong className="text-sm">30 aug</strong>
          </div>
          <button className="rounded border border-accent px-3 py-2 text-sm text-accent hover:bg-accent-wash">
            Redigera rutt
          </button>
        </Card>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-xl font-semibold tracking-tight">Aktuella arter</h2>
          <button className="border-b border-text text-xs">Alla följda arter</button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {species.map((item) => {
            const active: readonly number[] = activity?.[item.latin] ?? item.active
            return (
              <Card
                key={item.name}
                className="relative overflow-hidden border-l-4 border-l-accent shadow-sm"
              >
                <div className="pointer-events-none absolute inset-0">
                  <div
                    className="absolute inset-0"
                    style={{
                      filter:
                        "contrast(2.25) brightness(1.34) saturate(1.2) drop-shadow(0 0 0.35px var(--accent))",
                    }}
                  >
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/42 to-transparent" />
                </div>
                <div className="relative z-10 flex min-h-48 flex-col">
                  <Chip
                    variant="secondary"
                    className="w-fit text-[10px] font-semibold uppercase tracking-[.08em]"
                  >
                    {item.status}
                  </Chip>
                  <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="font-display text-lg font-semibold">{item.name}</h3>
                    <em className="font-mono text-xs text-text-muted">{item.latin}</em>
                  </div>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-text-faint">
                    <Icon name="map-pin" size={11} className="mr-1" />
                    {item.habitat}
                  </p>
                  <div className="mt-auto grid grid-cols-12 gap-1 pt-6">
                    {months.map((month, index) => (
                      <div key={`${month}-${index}`} className="text-center">
                        <span
                          className={`block h-3 rounded-sm border ${active.includes(index)
                            ? "border-accent bg-accent"
                            : "border-border bg-surface-2"
                            } ${index === 7 ? "outline-2 outline-offset-2 outline-text" : ""}`}
                        />
                        <span className="mt-1 block text-[8px] text-text-faint">{month}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-card border border-border border-t-4 border-t-accent bg-surface text-text shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-end">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wide text-accent">Avslutande period</span>
            <h2 className="mt-1 font-display text-xl font-semibold">Utgående arter</h2>
          </div>
          <span className="text-xs text-text-muted">Sorterat efter beräknat periodslut</span>
        </div>
        <div className="grid md:grid-cols-3">
          {[
            ["Tornseglare", "≈ 1–2 veckor · hög", "Varmt väder · kväll · öppet luftrum"],
            ["Klockgentiana", "Blomning avtar · medel", "Fukthed · mager mark"],
            ["Sandödla", "Aktivitet avtar · medel", "Soligt · sandmark · sydläge"],
          ].map(([name, timing, detail]) => (
            <article key={name} className="border-b border-border p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
              <span className="font-mono text-[10px] uppercase tracking-wide text-accent">{timing}</span>
              <h3 className="mt-3 font-display text-lg font-semibold">{name}</h3>
              <p className="mt-2 text-sm text-text-muted">{detail}</p>
            </article>
          ))}
        </div>
      </section>

      <p className="font-mono text-[10px] text-text-faint">
        Exempeldata för den första tenantytan. Artperioder verifieras när Tempus datalager kopplas in.
      </p>
    </div>
  )
}
