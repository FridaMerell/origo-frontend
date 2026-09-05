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
  const booking = bookings[index]
  const startDate = booking ? new Date(booking.start_date) : null

  return <Card className="col-span-1 h-full lg:col-span-7">
    {
      bookings && bookings.length > 0 ? (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-medium text-text-muted">
              <CalendarIcon size={16} />
              Nästa besök
            </span>
            <StepperButtons index={index} length={bookings.length} onIndexChange={setIndex} className="flex" />
          </div>
          <div className="grid flex-1 grid-cols-[7rem_minmax(0,1fr)] items-center gap-6">
            <div className="flex aspect-square flex-col items-center justify-center rounded-md bg-secondary-wash text-secondary">
              <span className="font-display text-5xl font-semibold leading-none">{startDate?.getDate()}</span>
              <span className="mt-1 text-xs font-medium uppercase tracking-wider">{startDate?.toLocaleDateString("sv-SE", { month: "short" }).replace(".", "")}</span>
            </div>
            <div className="min-w-0">
              <span className="block truncate font-display text-4xl font-semibold leading-tight">{booking.visitor}</span>
              <span className="mt-2 block text-sm text-text-muted">{formatDateShort(booking.start_date)} — {formatDateShort(booking.end_date)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center text-sm text-text-muted">Inga kommande besök.</div>
      )
    }
  </Card>
}
