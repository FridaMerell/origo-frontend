/** Swedish time, for dates that must be the same in the server render and in the browser. */
export const SWEDISH_TIME_ZONE = "Europe/Stockholm";

type DateInput = string | number | Date;
/** `timeZone` fixes the zone (e.g. SWEDISH_TIME_ZONE) so the server render and the browser agree. */
type ZoneOption = { timeZone?: string };

const ISO_DATE_PARTS = { year: "numeric", month: "2-digit", day: "2-digit" } as const;

/**
 * The calendar day of `date` as "YYYY-MM-DD": in the runtime's timezone, or in `timeZone`
 * (e.g. SWEDISH_TIME_ZONE). Never `toISOString()`, which gives the UTC day.
 */
export function isoDateKey(date: DateInput = new Date(), timeZone?: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { ...ISO_DATE_PARTS, timeZone })
      .formatToParts(new Date(date))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

const svFormats = new Map<string, Intl.DateTimeFormat>();

/** One cached sv-SE formatter per set of options, so frequent redraws do not build new ones. */
function svFormat(date: DateInput, options: Intl.DateTimeFormatOptions): string {
  const key = JSON.stringify(options);
  let format = svFormats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat("sv-SE", options);
    svFormats.set(key, format);
  }
  return format.format(new Date(date));
}

/** Short month and weekday names without the abbreviation dot: "okt", "mån". */
const withoutDots = (text: string) => text.replace(/\./g, "");

/** "12 maj 2026". */
export function formatDate(date: DateInput, { timeZone }: ZoneOption = {}): string {
  return svFormat(date, { dateStyle: "medium", timeZone });
}

/** "12 maj". */
export function formatDateShort(date: DateInput): string {
  return svFormat(date, { month: "short", day: "2-digit" });
}

/** "12 maj 2026" with the month written out. */
export function formatDateLong(date: DateInput, { timeZone }: ZoneOption = {}): string {
  return svFormat(date, { day: "numeric", month: "long", year: "numeric", timeZone });
}

/** Same as formatDateLong, but tolerates a null/empty/invalid input by returning null instead of "Invalid Date". */
export function formatDateLongOrNull(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : formatDateLong(date);
}

/** "2026-05-12", for display where a numeric date is wanted. */
export function formatDateNumeric(date: DateInput, { timeZone }: ZoneOption = {}): string {
  return isoDateKey(date, timeZone);
}

/** "12 maj 2026 14:30". */
export function formatDateTime(date: DateInput, { timeZone }: ZoneOption = {}): string {
  return svFormat(date, { dateStyle: "medium", timeStyle: "short", timeZone });
}

/** "14:30", or "14:30:05" with `seconds`. */
export function formatTime(date: DateInput, { seconds = false, timeZone }: ZoneOption & { seconds?: boolean } = {}): string {
  return svFormat(date, { hour: "2-digit", minute: "2-digit", ...(seconds ? { second: "2-digit" } : {}), timeZone });
}

/** "12 okt" (short, the default) or "12 oktober". */
export function formatDayMonth(date: DateInput, { month = "short", timeZone }: ZoneOption & { month?: "short" | "long" } = {}): string {
  const text = svFormat(date, { day: "numeric", month, timeZone });
  return month === "short" ? withoutDots(text) : text;
}

/** "måndag 12 oktober", or "mån 12 okt" with `short`. */
export function formatWeekdayDate(date: DateInput, { short = false, timeZone }: ZoneOption & { short?: boolean } = {}): string {
  return short
    ? withoutDots(svFormat(date, { weekday: "short", day: "numeric", month: "short", timeZone }))
    : svFormat(date, { weekday: "long", day: "numeric", month: "long", timeZone });
}

/** "måndag", or "mån" with `short`. */
export function formatWeekday(date: DateInput, { short = false }: { short?: boolean } = {}): string {
  return short ? withoutDots(svFormat(date, { weekday: "short" })) : svFormat(date, { weekday: "long" });
}

/** "oktober", or "okt" with `short`. */
export function formatMonthName(date: DateInput, { short = false }: { short?: boolean } = {}): string {
  return short ? withoutDots(svFormat(date, { month: "short" })) : svFormat(date, { month: "long" });
}

/** "oktober 2026". */
export function formatMonthYear(date: DateInput): string {
  return svFormat(date, { month: "long", year: "numeric" });
}

const ONE_DECIMAL = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 });

/** A measurement with at most one decimal, e.g. 20,6. */
export function formatOneDecimal(value: number): string {
  return ONE_DECIMAL.format(value);
}
