import Link from "next/link"

// The year summary is announced on the start page from 15 December to
// 15 January, Swedish time: in December for the year that is ending, in
// January for the one just over.
const STOCKHOLM_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Stockholm",
  year: "numeric",
  month: "numeric",
  day: "numeric",
})

/** The year the banner announces on `now`, or null outside 15 December–15 January. */
export function yearBannerYear(now: Date): number | null {
  const parts = Object.fromEntries(STOCKHOLM_DATE.formatToParts(now).map((part) => [part.type, Number(part.value)]))
  const { year, month, day } = parts as { year: number; month: number; day: number }
  if (month === 12 && day >= 15) return year
  if (month === 1 && day <= 15) return year - 1
  return null
}

const MONTH_NAMES = ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"]

// The year's observations per month in small, as on the year page: green bars
// on one baseline, the busiest month in ink, month initials beneath. The rust
// accent never stands beside the green.
function MonthBars({ months }: { months: number[] }) {
  const most = Math.max(...months)
  const busiest = months.indexOf(most)
  return (
    <span className="flex flex-col" role="img" aria-label={`Observationer per månad, flest i ${MONTH_NAMES[busiest]}`}>
      <span aria-hidden="true" className="flex h-20 items-end gap-1.5 border-b border-text">
        {months.map((count, index) => (
          <span
            key={MONTH_NAMES[index]}
            className={`w-3 ${index === busiest ? "bg-text" : "bg-secondary"}`}
            style={{ height: `${(count / most) * 100}%` }}
          />
        ))}
      </span>
      <span aria-hidden="true" className="mt-1.5 flex gap-1.5 font-display text-xs italic text-text-muted">
        {MONTH_NAMES.map((name) => (
          <span key={name} className="w-3 text-center">
            {name[0]}
          </span>
        ))}
      </span>
    </span>
  )
}

// A band across the sheet under the title strip, ruled like it: the year and
// a line, the year's months as small bars, and the link, whose line draws in
// under the pointer. All three stand on the same baseline; when the row is
// too narrow the bars and the link wrap together under the year.
export function YearBanner({ year, months }: { year: number; months: number[] | null }) {
  const showMonths = months !== null && months.length === 12 && months.some(Boolean)
  return (
    <Link
      href={`/ar/${year}`}
      className="group flex flex-wrap items-end justify-between gap-x-10 gap-y-5 border-b border-text py-6 text-text no-underline sm:py-7"
    >
      <span>
        <span className="block font-display text-5xl font-semibold leading-[0.9] tracking-tight tabular-nums sm:text-6xl">{year}</span>
        <span className="mt-1.5 block font-display text-xl italic xl:text-2xl">Årssammanfattningen är klar</span>
      </span>
      <span className="flex grow items-end justify-between gap-10 sm:grow-0">
        {showMonths ? <MonthBars months={months} /> : null}
        <span className="mb-6 bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-[position:0_100%] bg-no-repeat font-display text-lg italic whitespace-nowrap text-accent transition-[background-size] duration-500 ease-out group-hover:bg-[length:100%_1px] sm:text-xl">
          Se ditt år ›
        </span>
      </span>
    </Link>
  )
}
