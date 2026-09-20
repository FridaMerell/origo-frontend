"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/app/components/ui/Card";
import { useBookingData } from "@/app/verso/_state/verso-context";
import { BookVisitButton } from "@/app/verso/besok/book-visit-button";
import { StayBar } from "@/app/verso/besok/stay-bar";
import { WEEKDAYS, buildMonthCells, isSameDay, toStays } from "@/app/verso/besok/calendar";
import { formatMonthYear } from "@/app/lib/formatters";
import { ChevronLeft, ChevronRight } from "lucide-react";

const monthLinkClass =
  "flex size-9 items-center justify-center rounded text-text-muted hover:bg-accent-wash hover:text-accent sm:size-6";

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

  const cells = buildMonthCells(year, month);
  const stays = toStays(bookings);

  return (
    <div className="container flex min-w-0 flex-1 flex-col gap-5 py-5 sm:gap-6 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href={`?y=${prevMonth.getFullYear()}&m=${prevMonth.getMonth() + 1}`}
            aria-label="Föregående månad"
            className={monthLinkClass}
          >
            <ChevronLeft size={16} />
          </Link>
          <h1 className="m-0 whitespace-nowrap font-display text-xl font-semibold text-text sm:text-2xl">
            {formatMonthYear(new Date(year, month, 1))}
          </h1>
          <Link
            href={`?y=${nextMonth.getFullYear()}&m=${nextMonth.getMonth() + 1}`}
            aria-label="Nästa månad"
            className={monthLinkClass}
          >
            <ChevronRight size={16} />
          </Link>
        </div>
        <div className="self-start sm:self-auto">
          <BookVisitButton />
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-7 border-b border-l border-t border-border">
          {WEEKDAYS.map((d) => (
            <div key={d} className="border-r border-border px-3 py-2.5 text-xs font-semibold text-text-muted">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 border-l border-border">
          {cells.map(({ date, inMonth }, i) => {
            const isRowStart = i % 7 === 0;
            const dayStays = stays.filter((s) => date >= s.start && date <= s.end);
            return (
              <div
                key={i}
                className={`relative box-border block min-h-[64px] overflow-clip border-b border-r border-border sm:min-h-[74px] ${inMonth ? "" : "opacity-40"}`}
              >
                <span className="p-1.5 text-xs text-text-faint">{date.getDate()}</span>
                {dayStays.map((stay) => {
                  const isStart = isSameDay(date, stay.start);
                  const isLastDay = isSameDay(date, stay.end);
                  return (
                    <div key={stay.booking.id} className={`${isStart ? "pl-1.5" : ""} ${isLastDay ? "pr-1.5" : ""}`}>
                      <StayBar
                        booking={stay.booking}
                        color={stay.color}
                        showLabel={isStart || isRowStart}
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

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {stays.map((s) => (
          <div key={s.booking.id} className="flex items-center gap-2 font-body text-sm text-text-muted">
            <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
            {s.booking.visitor}
          </div>
        ))}
      </div>
    </div>
  );
}
