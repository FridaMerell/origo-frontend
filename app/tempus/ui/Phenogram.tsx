import type { TempusPhenogram, TempusSeasonalStatus } from "@/app/lib/dal"
import { Chip } from "@/app/components/ui/Chip"

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]

const STATUS_LABELS: Record<TempusSeasonalStatus["status"], string> = {
  out_of_season: "Utanför säsong",
  coming_into_season: "På väg in i säsong",
  in_season: "I säsong",
  at_peak: "Toppsäsong",
  going_out_of_season: "På väg ut ur säsong",
}

// The phenogram's `seasonal_status` as a chip: accent while the species is in
// or entering season, muted otherwise, with a "börjar/slutar om N d" hint on
// the transition states.
export function SeasonalStatusBadge({ status }: { status?: TempusSeasonalStatus | null }) {
  if (!status) return null
  const active = status.is_in_season || status.is_coming_into_season
  const hint =
    status.status === "coming_into_season" && status.days_until_start != null
      ? `börjar om ${status.days_until_start} d`
      : status.status === "going_out_of_season" && status.days_until_end != null
        ? `slutar om ${status.days_until_end} d`
        : null

  return (
    <Chip
      variant={active ? "accent" : "neutral"}
      className="w-fit gap-1.5 text-[10px] uppercase tracking-wide"
    >
      {STATUS_LABELS[status.status]}
      {hint && <span className="text-text-faint">· {hint}</span>}
    </Chip>
  )
}

const inWindow = (week: number, start: number, end: number) =>
  start <= end ? week >= start && week <= end : week >= start || week <= end

// ISO week (1–52) → month index (0–11).
const weekToMonth = (week: number) => Math.min(11, Math.floor(((week - 1) * 12) / 52))

// The set of months the activity window touches, wrapping the year end when
// start_week > end_week (same mapping the home cards use).
const windowMonths = ({ start_week, end_week }: { start_week: number; end_week: number }) => {
  const weeks: number[] = []
  if (start_week <= end_week) {
    for (let w = start_week; w <= end_week; w++) weeks.push(w)
  } else {
    for (let w = start_week; w <= 52; w++) weeks.push(w)
    for (let w = 1; w <= end_week; w++) weeks.push(w)
  }
  return new Set(weeks.map(weekToMonth))
}

const dayOfYear = (day: number | null) => {
  if (day == null) return "—"
  const date = new Date(Date.UTC(2001, 0, day))
  return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short" })
}

const percent = (value: number | null) =>
  value == null ? "—" : `${Math.round(value * 100)} %`

// The day-of-year envelope and provenance line shared by every phenogram
// visualisation.
export function PhenogramSummary({ phenogram }: { phenogram: TempusPhenogram }) {
  const {
    activity_window,
    peak_week,
    record_count,
    record_limit_hit,
    years_present,
    confidence,
    smooth_weeks,
    declustered,
    stale,
  } = phenogram

  const facts: Array<[string, string]> = [
    ["Start", dayOfYear(phenogram.start_day_of_year)],
    ["Topp från", dayOfYear(phenogram.peak_start_day)],
    ["Topp till", dayOfYear(phenogram.peak_end_day)],
    ["Slut", dayOfYear(phenogram.end_day_of_year)],
  ]

  return (
    <>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
        {facts.map(([term, value]) => (
          <div key={term} className="flex flex-col gap-0.5">
            <dt className="font-mono text-[10px] uppercase tracking-wide text-text-faint">{term}</dt>
            <dd className="text-sm text-text">{value}</dd>
          </div>
        ))}
      </dl>

      <figcaption className="font-mono text-[10px] uppercase leading-relaxed tracking-wide text-text-faint">
        {(record_count ?? 0).toLocaleString("sv-SE")} fynd{record_limit_hit ? " (tak nått)" : ""} ·{" "}
        {years_present} år · topp vecka {peak_week} · aktiv vecka {activity_window?.start_week}–
        {activity_window?.end_week} · säkerhet {percent(confidence)} · utjämning {smooth_weeks} v
        {declustered ? " · avklustrad" : ""}
        {stale ? " · inaktuell" : ""}
      </figcaption>
    </>
  )
}

type PhenogramVariant = "bars" | "months"

// The weekly activity curve distilled from Species Observation System records.
// `variant="bars"` (default) draws 52 weekly fraction bars with the derived
// activity window in the accent colour and the peak week emphasised;
// `variant="months"` collapses to the 12-month strip used on the home cards,
// with the current month ringed. The day-of-year envelope and provenance sit
// underneath either way. The cyclical view lives in `PhenogramWheel`.
export function Phenogram({
  phenogram,
  variant = "bars",
}: {
  phenogram: TempusPhenogram
  variant?: PhenogramVariant
}) {
  return (
    <figure className="flex flex-col gap-4">
      {variant === "months" ? (
        <MonthStrip phenogram={phenogram} />
      ) : (
        <WeekBars phenogram={phenogram} />
      )}
      <PhenogramSummary phenogram={phenogram} />
    </figure>
  )
}

function WeekBars({ phenogram }: { phenogram: TempusPhenogram }) {
  const { peak_week, activity_window } = phenogram
  const weeks = phenogram.weeks ?? []
  const max = Math.max(...weeks.map((w) => w.fraction), 0.0001)

  const width = 520
  const top = 10
  const baseline = 130
  const barWidth = width / 52

  return (
    <svg
      viewBox={`0 0 ${width} 148`}
      className="w-full"
      role="img"
      aria-label={`Aktivitet per vecka över året, med topp under vecka ${peak_week}`}
    >
      {weeks.map((w) => {
        const height = Math.max((w.fraction / max) * (baseline - top), 0.5)
        const active = inWindow(w.week, activity_window.start_week, activity_window.end_week)
        return (
          <rect
            key={w.week}
            x={(w.week - 1) * barWidth + 0.5}
            y={baseline - height}
            width={barWidth - 1}
            height={height}
            fill={active ? "var(--accent)" : "var(--border-strong)"}
            opacity={w.week === peak_week ? 1 : active ? 0.85 : 0.4}
          />
        )
      })}
      <line x1={0} y1={baseline} x2={width} y2={baseline} stroke="var(--border)" strokeWidth={1} />
      {MONTHS.map((month, index) => {
        const x = (index / 12) * width
        return (
          <g key={index}>
            <line x1={x} y1={baseline} x2={x} y2={baseline + 4} stroke="var(--border)" strokeWidth={1} />
            <text
              x={x + 2}
              y={baseline + 14}
              fontSize={8}
              fontFamily="monospace"
              fill="var(--text-faint)"
            >
              {month}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function MonthStrip({ phenogram }: { phenogram: TempusPhenogram }) {
  const active = windowMonths(phenogram.activity_window)
  const peakMonth = weekToMonth(phenogram.peak_week)
  const currentMonth = new Date().getMonth()

  return (
    <div
      className="grid grid-cols-12 gap-1"
      role="img"
      aria-label={`Aktiva månader, topp i ${new Date(2001, peakMonth).toLocaleDateString("sv-SE", {
        month: "long",
      })}`}
    >
      {MONTHS.map((month, index) => (
        <div key={`${month}-${index}`} className="text-center">
          <span
            className={`block h-3 rounded-sm border ${
              active.has(index) ? "border-accent bg-accent" : "border-border bg-surface-2"
            } ${index === currentMonth ? "outline-2 outline-offset-2 outline-text" : ""}`}
          />
          <span className="mt-1 block text-[8px] text-text-faint">{month}</span>
        </div>
      ))}
    </div>
  )
}

export default Phenogram
