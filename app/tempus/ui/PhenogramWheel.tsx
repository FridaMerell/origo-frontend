import type { TempusPhenogram } from "@/app/lib/dal"
import { PhenogramSummary } from "./Phenogram"

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]

const TAU = Math.PI * 2
// Week 1 starts at the top of the ring; weeks run clockwise.
const angleOf = (week: number) => -Math.PI / 2 + ((week - 1) / 52) * TAU
const point = (cx: number, cy: number, r: number, a: number): [number, number] => [
  cx + r * Math.cos(a),
  cy + r * Math.sin(a),
]

const inWindow = (week: number, start: number, end: number) =>
  start <= end ? week >= start && week <= end : week >= start || week <= end

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const [x0, y0] = point(cx, cy, r, a0)
  const [x1, y1] = point(cx, cy, r, a1)
  let delta = a1 - a0
  while (delta < 0) delta += TAU
  const large = delta > Math.PI ? 1 : 0
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`
}

// Cyclical phenogram: the 52 weeks wrapped around a year ring, each week a
// spoke whose length is that week's record fraction. The derived activity
// window is an accent arc on the rim and the peak week is the fully opaque
// spoke — the layout keeps windows that cross the year end (start_week >
// end_week) in one continuous piece. Envelope + provenance below, shared with
// `Phenogram`.
export function PhenogramWheel({ phenogram }: { phenogram: TempusPhenogram }) {
  const { weeks, peak_week, activity_window } = phenogram
  const max = Math.max(...weeks.map((w) => w.fraction), 0.0001)

  const size = 200
  const cx = size / 2
  const cy = size / 2
  const r0 = 46
  const len = 34

  return (
    <figure className="flex flex-col gap-4">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="mx-auto w-full max-w-[280px]"
        role="img"
        aria-label={`Aktivitet per vecka runt året, med topp under vecka ${peak_week}`}
      >
        <circle cx={cx} cy={cy} r={r0} fill="none" stroke="var(--border)" strokeWidth={1} />

        <path
          d={arc(
            cx,
            cy,
            r0,
            angleOf(activity_window.start_week),
            angleOf(activity_window.end_week + 1)
          )}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={3}
          strokeLinecap="round"
        />

        {weeks.map((w) => {
          const a = angleOf(w.week)
          const [x0, y0] = point(cx, cy, r0, a)
          const [x1, y1] = point(cx, cy, r0 + Math.max((w.fraction / max) * len, 0.5), a)
          const active = inWindow(w.week, activity_window.start_week, activity_window.end_week)
          return (
            <line
              key={w.week}
              x1={x0}
              y1={y0}
              x2={x1}
              y2={y1}
              stroke={active ? "var(--accent)" : "var(--border-strong)"}
              strokeWidth={1.4}
              strokeLinecap="round"
              opacity={w.week === peak_week ? 1 : active ? 0.85 : 0.4}
            />
          )
        })}

        {MONTHS.map((month, index) => {
          const a = -Math.PI / 2 + (index / 12) * TAU
          const [x, y] = point(cx, cy, r0 + len + 10, a)
          return (
            <text
              key={index}
              x={x}
              y={y}
              fontSize={7}
              fontFamily="monospace"
              fill="var(--text-faint)"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {month}
            </text>
          )
        })}
      </svg>

      <PhenogramSummary phenogram={phenogram} />
    </figure>
  )
}

export default PhenogramWheel
