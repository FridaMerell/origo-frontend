"use client"

// Purely decorative — the map never rotates (dragRotate is off), so this
// always points the same way. It's here for the antique-map look, not for
// orientation.
export type CompassProps = {
  className?: string
  size?: number
}

// Avrundat, så att server och webbläsare skriver ut samma koordinater: sin/cos
// kan skilja i sista decimalen mellan Node och webbläsaren, vilket gav hydreringsfel.
const fixed = (value: number) => Math.round(value * 100) / 100

/**
 * Gammal kartkompass: åttauddig ros med fleur-de-lis mot norr,
 * graverad i sepiabläck på ett avskärmat halvgenomskinligt fält.
 */
export function Compass({ className = "absolute bottom-[4.5rem] right-5 z-20", size = 96 }: CompassProps) {
  const c = size / 2
  const rOuter = c - 3
  const rLong = c - 12
  const rShort = rLong * 0.62
  return <div className={className} aria-hidden="true">
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
      {/* avskärmat fält */}
      <circle cx={c} cy={c} r={rOuter + 2} fill="#fbf8f0" opacity="0.82" />
      {/* ytterring med grader */}
      <circle cx={c} cy={c} r={rOuter} fill="none" stroke="#4a3a26" strokeWidth="1.1" />
      <circle cx={c} cy={c} r={rOuter - 3} fill="none" stroke="#4a3a26" strokeWidth="0.5" />
      {Array.from({ length: 32 }).map((_, i) => {
        const a = (i * Math.PI) / 16
        const long = i % 8 === 0
        const r1 = rOuter
        const r2 = rOuter - (long ? 5 : i % 4 === 0 ? 3.5 : 2)
        return (
          <line
            key={i}
            x1={fixed(c + Math.sin(a) * r1)}
            y1={fixed(c - Math.cos(a) * r1)}
            x2={fixed(c + Math.sin(a) * r2)}
            y2={fixed(c - Math.cos(a) * r2)}
            stroke="#4a3a26"
            strokeWidth="0.6"
          />
        )
      })}
      {/* åtta uddar: huvududdar långa, mellanuddar kortare.
          Varje udd är två halvor — en mörk, en ljus — för den graverade looken. */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const isMain = deg % 90 === 0
        const r = isMain ? rLong : rShort
        const a = (deg * Math.PI) / 180
        const tip = { x: fixed(c + Math.sin(a) * r), y: fixed(c - Math.cos(a) * r) }
        const w = r * 0.16
        const left = {
          x: fixed(c + Math.sin(a - Math.PI / 2) * w),
          y: fixed(c - Math.cos(a - Math.PI / 2) * w),
        }
        const right = {
          x: fixed(c + Math.sin(a + Math.PI / 2) * w),
          y: fixed(c - Math.cos(a + Math.PI / 2) * w),
        }
        return (
          <g key={deg}>
            <polygon points={`${tip.x},${tip.y} ${left.x},${left.y} ${c},${c}`} fill={isMain ? "#6b5738" : "#a08b62"} stroke="#4a3a26" strokeWidth="0.5" />
            <polygon points={`${tip.x},${tip.y} ${right.x},${right.y} ${c},${c}`} fill="#e8e0cc" stroke="#4a3a26" strokeWidth="0.5" />
          </g>
        )
      })}
      <circle cx={c} cy={c} r="2.2" fill="#4a3a26" />
      {/* fleur-de-lis mot norr */}
      <g transform={`translate(${c} ${c - rLong - 9}) scale(${size / 96})`} fill="#4a3a26">
        <path d="M0,-7 C1.6,-4.6 2.2,-3.2 2.2,-1.8 C2.2,-0.4 1.2,0.6 0,0.6 C-1.2,0.6 -2.2,-0.4 -2.2,-1.8 C-2.2,-3.2 -1.6,-4.6 0,-7 Z" />
        <path d="M-1.4,-0.4 C-3.6,-0.6 -5.4,-1.8 -6,-3.6 C-4.2,-3.4 -2.6,-2.6 -1.2,-1.4 Z" />
        <path d="M1.4,-0.4 C3.6,-0.6 5.4,-1.8 6,-3.6 C4.2,-3.4 2.6,-2.6 1.2,-1.4 Z" />
        <rect x="-0.7" y="0.4" width="1.4" height="3" rx="0.5" />
        <path d="M-2.4,4.4 L0,2.4 L2.4,4.4 L0,3.6 Z" />
      </g>
      {/* satt mot söder: en liten krona, som på äldre stockar */}
      <g transform={`translate(${c} ${c + rLong + 12}) scale(${size / 96})`} fill="none" stroke="#4a3a26" strokeWidth="0.9">
        <path d="M-4,3 L-4,-1 L-1.6,1 L0,-2.4 L1.6,1 L4,-1 L4,3 Z" />
      </g>
    </svg>
  </div>
}
