"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/app/components/ui/Card";
import { Icon } from "@/app/components/ui/Icon";
import { useBookingData } from "@/app/verso/_state/booking-context";
import { BookVisitButton } from "@/app/verso/besok/book-visit-button";
import { BookingDrawerProvider } from "@/app/verso/besok/booking-drawer-context";
import { StayBar } from "@/app/verso/besok/stay-bar";
import type { Booking } from "@/app/lib/dal";

const WEEKDAYS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

const STAY_COLORS = ["var(--accent)", "var(--secondary)", "var(--danger)"];

type Stay = {
  booking: Booking;
  who: string;
  color: string;
  start: Date;
  end: Date;
};

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function BesokView() {
  const { bookings } = useBookingData();
  const searchParams = useSearchParams();

  const today = new Date();
  const yParam = searchParams.get("y");
  const mParam = searchParams.get("m");
  const year = yParam ? Number(yParam) : today.getFullYear();
  const month = mParam ? Number(mParam) - 1 : today.getMonth();

  const prevMonth = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month + 1, 1);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Mon = 0

  type Cell = { date: Date; inMonth: boolean } | null;

  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: Cell[] = [
    ...Array.from({ length: firstWeekday }, (_, i): Cell => ({
      date: new Date(year, month - 1, daysInPrevMonth - firstWeekday + i + 1),
      inMonth: false,
    })),
    ...Array.from({ length: daysInMonth }, (_, i): Cell => ({ date: new Date(year, month, i + 1), inMonth: true })),
  ];
  const trailingCount = (7 - (cells.length % 7)) % 7;
  cells.push(
    ...Array.from({ length: trailingCount }, (_, i): Cell => ({
      date: new Date(year, month + 1, i + 1),
      inMonth: false,
    }))
  );

  const stays: Stay[] = bookings
    .map((b, i) => ({
      booking: b,
      who: b.visitor,
      color: STAY_COLORS[i % STAY_COLORS.length],
      start: parseLocalDate(b.start_date),
      end: parseLocalDate(b.end_date),
    }));

  const monthLabel = new Date(year, month, 1).toLocaleDateString("sv-SE", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-1 flex-col gap-5 p-7">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`?y=${prevMonth.getFullYear()}&m=${prevMonth.getMonth() + 1}`}
            aria-label="Föregående månad"
            className="flex size-6 items-center justify-center rounded text-text-muted hover:bg-accent-wash hover:text-accent"
          >
            <Icon name="chevron-left" size={16} />
          </Link>
          <h1 className="m-0 font-display text-2xl font-semibold text-text">{monthLabel}</h1>
          <Link
            href={`?y=${nextMonth.getFullYear()}&m=${nextMonth.getMonth() + 1}`}
            aria-label="Nästa månad"
            className="flex size-6 items-center justify-center rounded text-text-muted hover:bg-accent-wash hover:text-accent"
          >
            <Icon name="chevron-right" size={16} />
          </Link>
        </div>
        <BookVisitButton />
      </div>

      <BookingDrawerProvider>
        <Card className="overflow-hidden p-0">
          <div className="grid grid-cols-7 border-b border-l border-t border-border">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="border-r border-border px-3 py-2.5 text-xs font-semibold text-text-muted"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 border-l border-border">
            {cells.map((cell, i) => {
              const date = cell?.date ?? null;
              const dayStays = date ? stays.filter((s) => date >= s.start && date <= s.end) : [];
              const isRowStart = i % 7 === 0;
              return (
                <div
                  key={i}
                  className={`relative box-border min-h-[74px] block border-r border-b border-border overflow-clip ${cell && !cell.inMonth ? "opacity-40" : ""}`}
                >
                  {date && <span className="text-xs text-text-faint  p-1.5">{date.getDate()}</span>}
                  {date &&
                    dayStays.map((stay) => {
                      const isStart = isSameDay(date, stay.start);
                      const isLastDay = isSameDay(date, stay.end);
                      const showLabel = isStart || isRowStart;
                      return (
                        <div key={stay.booking.id} className={`${isStart ? "pl-1.5" : ""} ${isLastDay ? "pr-1.5" : ""}`}>
                          <StayBar
                            booking={stay.booking}
                            color={stay.color}
                            showLabel={Boolean(showLabel)}
                            roundLeft={isStart}
                            roundRight={isLastDay}
                          />
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </Card>
      </BookingDrawerProvider>

      <div className="flex gap-5">
        {stays.map((s, i) => (
          <div key={i} className="flex items-center gap-2 font-body text-sm text-text-muted">
            <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
            {s.who}
          </div>
        ))}
      </div>
    </div>
  );
}
