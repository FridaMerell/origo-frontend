"use client"

export function CompassRose({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`} pointerEvents="none">
    <circle r={25} fill="var(--surface)" fillOpacity={0.88} stroke="var(--text)" strokeWidth={0.9} />
    <circle r={4} fill="none" stroke="var(--text)" strokeWidth={0.7} />
    <path d="M0 -21 L3 -4 L0 0 L-3 -4 Z" fill="var(--text)" />
    <path d="M0 21 L3 4 L0 0 L-3 4 Z" fill="var(--surface)" stroke="var(--text)" strokeWidth={0.8} />
    <path d="M-21 0 L-4 -3 L0 0 L-4 3 Z M21 0 L4 -3 L0 0 L4 3 Z" fill="var(--surface)" stroke="var(--text)" strokeWidth={0.8} />
    <line x1={-16} y1={-16} x2={16} y2={16} stroke="var(--text)" strokeWidth={0.45} opacity={0.7} />
    <line x1={16} y1={-16} x2={-16} y2={16} stroke="var(--text)" strokeWidth={0.45} opacity={0.7} />
    <text x={0} y={-30} fontSize={10} fill="var(--text)" textAnchor="middle" fontFamily="var(--font-display)">N</text>
  </g>
}
