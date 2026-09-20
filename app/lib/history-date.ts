import type { DatePrecision } from "@/app/lib/dal"

const MONTHS = [
  "januari", "februari", "mars", "april", "maj", "juni",
  "juli", "augusti", "september", "oktober", "november", "december",
]

function parts(date: string) {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number)
  return { year, month, day }
}

/** "12 maj 1923", "maj 1923", "1923", "1920-talet" or "ca 1923", depending on precision. */
export function formatHistoricalDate(date: string | null | undefined, precision: DatePrecision = "day"): string {
  if (!date) return "Odaterad"
  const { year, month, day } = parts(date)
  if (!year) return "Odaterad"

  switch (precision) {
    case "circa":
      return `ca ${year}`
    case "decade":
      return `${Math.floor(year / 10) * 10}-talet`
    case "year":
      return String(year)
    case "month":
      return `${MONTHS[month - 1] ?? ""} ${year}`.trim()
    default:
      return `${day} ${MONTHS[month - 1] ?? ""} ${year}`.replace("  ", " ").trim()
  }
}

/** Start year of the decade a date falls in, or null for undated items. */
export function decadeOf(date: string | null | undefined): number | null {
  if (!date) return null
  const { year } = parts(date)
  return year ? Math.floor(year / 10) * 10 : null
}
