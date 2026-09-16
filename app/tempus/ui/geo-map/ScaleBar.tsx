"use client"

import { useState } from "react"

const TILE_SIZE = 256
const EARTH_CIRCUMFERENCE_M = 2 * Math.PI * 6378137
// Gammal svensk aln (fastställd 1665): ca 0,5938 m.
const METERS_PER_ALN = 0.5938
const OLD_SWEDISH_MILE_M = 10688.54
const FJARDINGSVAG_M = OLD_SWEDISH_MILE_M / 4
const MAX_BAR_WIDTH = 170
const NICE_ALNAR_STEPS = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000, 200000]
const NICE_METERS_STEPS = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000, 200000, 250000, 500000, 1000000, 2000000, 2500000, 5000000, 10000000]
const HISTORIC_ROAD_STEPS = [FJARDINGSVAG_M, OLD_SWEDISH_MILE_M / 2, OLD_SWEDISH_MILE_M, OLD_SWEDISH_MILE_M * 2, OLD_SWEDISH_MILE_M * 4, OLD_SWEDISH_MILE_M * 8, OLD_SWEDISH_MILE_M * 16, OLD_SWEDISH_MILE_M * 32, OLD_SWEDISH_MILE_M * 64, OLD_SWEDISH_MILE_M * 128, OLD_SWEDISH_MILE_M * 256, OLD_SWEDISH_MILE_M * 512, OLD_SWEDISH_MILE_M * 1024]

function metersPerMapUnit(lat: number, zoom: number): number {
  return (Math.cos((lat * Math.PI) / 180) * EARTH_CIRCUMFERENCE_M) / (TILE_SIZE * 2 ** zoom)
}

/** Rundar av till närmaste "fina" alntal som ryms inom MAX_BAR_WIDTH kartenheter vid given lat/zoom. */
function niceAlnarForWidth(lat: number, zoom: number): number {
  const maxAlnar = (MAX_BAR_WIDTH * metersPerMapUnit(lat, zoom)) / METERS_PER_ALN
  let chosen = NICE_ALNAR_STEPS[0]!
  for (const step of NICE_ALNAR_STEPS) {
    if (step > maxAlnar) break
    chosen = step
  }
  return chosen
}

function niceMetersForWidth(lat: number, zoom: number): number {
  const maxMeters = MAX_BAR_WIDTH * metersPerMapUnit(lat, zoom)
  let chosen = NICE_METERS_STEPS[0]!
  for (const step of NICE_METERS_STEPS) {
    if (step > maxMeters) break
    chosen = step
  }
  return chosen
}

function historicalScale(lat: number, zoom: number): { meters: number; label: string } {
  const maxMeters = MAX_BAR_WIDTH * metersPerMapUnit(lat, zoom)
  if (maxMeters < FJARDINGSVAG_M) {
    const alnar = niceAlnarForWidth(lat, zoom)
    return { meters: alnar * METERS_PER_ALN, label: `${alnar} alnar` }
  }
  let meters = HISTORIC_ROAD_STEPS[0]!
  for (const step of HISTORIC_ROAD_STEPS) {
    if (step > maxMeters) break
    meters = step
  }
  if (meters === FJARDINGSVAG_M) return { meters, label: "1 fjärdingsväg" }
  if (meters === OLD_SWEDISH_MILE_M / 2) return { meters, label: "½ gammal mil" }
  const miles = meters / OLD_SWEDISH_MILE_M
  return { meters, label: miles === 1 ? "1 gammal mil" : `${miles} gamla mil` }
}

function modernScale(lat: number, zoom: number): { meters: number; label: string } {
  const maxMeters = MAX_BAR_WIDTH * metersPerMapUnit(lat, zoom)
  const meters = niceMetersForWidth(lat, zoom)
  return { meters, label: meters >= 1000 ? `${meters / 1000} km` : `${meters} m` }
}

// Skalstocken använder fasta SVG-koordinater, så den behåller sin plats på
// skärmen medan kartans geometri panoreras bakom den.
export function ScaleBar({ lat, zoom, x, y }: { lat: number; zoom: number; x: number; y: number }) {
  const [modernUnits, setModernUnits] = useState(false)
  const { meters, label } = modernUnits ? modernScale(lat, zoom) : historicalScale(lat, zoom)
  const totalWidth = meters / metersPerMapUnit(lat, zoom)

  // Ingen <title> här — SVG:ns <title> delar tagg-namn med HTML:s dokument-
  // titel, vilket gör den till ett vanligt mål för webbläsartillägg som
  // skriver om DOM:en innan React hydrerar (exakt "browser extension"-fallet
  // i Reacts hydreringsfelsmeddelande). aria-label täcker tillgängligheten.
  return <g transform={`translate(${x} ${y})`} role="button" tabIndex={0} aria-label={`${label}. Växla till ${modernUnits ? "historiska" : "moderna"} mått.`} onPointerDown={(event) => event.stopPropagation()} onClick={() => setModernUnits((value) => !value)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setModernUnits((value) => !value) } }} style={{ cursor: "pointer" }}>
    <rect x={-10} y={-16} width={totalWidth + 20} height={42} fill="transparent" />
    <line x1={0} y1={0} x2={totalWidth} y2={0} stroke="var(--text)" strokeWidth={1} />
    <line x1={0} y1={-5} x2={0} y2={5} stroke="var(--text)" strokeWidth={1} />
    <line x1={totalWidth} y1={-5} x2={totalWidth} y2={5} stroke="var(--text)" strokeWidth={1} />
    <text x={totalWidth / 2} y={18} fontSize={11} fill="var(--text)" textAnchor="middle">{label}</text>
  </g>
}
