"use client"

import { useState } from "react"
import { CalendarIcon } from "lucide-react"
import { Card } from "../components/ui/Card"
import { useBookingData } from "./_state/booking-context"
import { formatDateShort } from "../lib/formatters"
import { StepperButtons } from "./stepper-buttons"

export function NextVisitWidget() {
  const { bookings } = useBookingData()
  const [index, setIndex] = useState(0)
  return <Card className="col-span-1 flex min-h-52 flex-col justify-between border-border-strong p-5 lg:col-span-7">
    {
      bookings && bookings.length > 0 ? (

        <div className="flex flex-col gap-5">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            <CalendarIcon size={14} />
            Nästa besök
          </span>
          <div className="flex flex-col gap-1.5">
            <span className="font-display text-3xl font-semibold leading-none">{bookings[index].visitor}</span>
            <span className="text-sm text-text-muted">{formatDateShort(bookings[index].start_date)} — {formatDateShort(bookings[index].end_date)}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center text-sm text-text-muted">Inga kommande besök.</div>
      )
    }

    <StepperButtons index={index} length={bookings.length} onIndexChange={setIndex} className="mt-6 flex justify-between gap-1" />
  </Card>
}
