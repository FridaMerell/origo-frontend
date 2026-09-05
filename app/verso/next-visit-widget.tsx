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
  return <Card className="w-full col-span-6 md:col-span-4 lg:col-span-4 flex flex-col justify-between">
    {
      bookings && bookings.length > 0 ? (

        <div className="flex flex-col gap-2">
          <span className="text-text-faint text-xs ">
            <CalendarIcon size={13} className="inline-block mr-1" />
            Nästa besök
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-display font-bold">{bookings[index].visitor}</span>
            <span className="text-sm text-text-muted">{formatDateShort(bookings[index].start_date)} - {formatDateShort(bookings[index].end_date)}</span>
          </div>
        </div>
      ) : (
        <div className="text-center text-text-muted">Inga kommande besök.</div>
      )
    }

    <StepperButtons index={index} length={bookings.length} onIndexChange={setIndex} className="flex gap-1 justify-between mt-2" />
  </Card>
}
