export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("sv-SE", { dateStyle: "medium" });
}

export function formatDateShort(date: string | Date): string {
  return new Date(date).toLocaleDateString("sv-SE", { month: "short", day: "2-digit" });
}

export function formatDateLong(date: string | Date): string {
  return new Date(date).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });
}

/** Same as formatDateLong, but tolerates a null/empty/invalid input by returning null instead of "Invalid Date". */
export function formatDateLongOrNull(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : formatDateLong(date);
}

const ONE_DECIMAL = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 });

/** A measurement with at most one decimal, e.g. 20,6. */
export function formatOneDecimal(value: number): string {
  return ONE_DECIMAL.format(value);
}

export function formatMonthYear(date: string | Date): string {
  return new Date(date).toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
}
