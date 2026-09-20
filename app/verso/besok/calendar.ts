import type { Booking } from "@/app/lib/dal";

export const WEEKDAYS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

const STAY_COLORS = ["var(--accent)", "var(--secondary)", "var(--danger)"];

export type Stay = {
  booking: Booking;
  color: string;
  start: Date;
  end: Date;
};

export type CalendarCell = { date: Date; inMonth: boolean };

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Parses "YYYY-MM-DD" as a local date (new Date(str) would parse as UTC). */
export function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Month grid padded with days from the neighbouring months so every row has 7 cells, Monday first. */
export function buildMonthCells(year: number, month: number): CalendarCell[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingCount = (new Date(year, month, 1).getDay() + 6) % 7;
  const trailingCount = (7 - ((leadingCount + daysInMonth) % 7)) % 7;

  return Array.from({ length: leadingCount + daysInMonth + trailingCount }, (_, i) => {
    // Date normalises out-of-range days, so day offsets past either end land in the neighbouring month.
    const date = new Date(year, month, i - leadingCount + 1);
    return { date, inMonth: date.getMonth() === month };
  });
}

export function toStays(bookings: Booking[]): Stay[] {
  return bookings.map((booking, i) => ({
    booking,
    color: STAY_COLORS[i % STAY_COLORS.length],
    start: parseLocalDate(booking.start_date),
    end: parseLocalDate(booking.end_date),
  }));
}
