'use client'
import { useBookingData, useFacilities } from "@/app/verso/_state/verso-context"
import { BookVisitButton } from "@/app/verso/besok/book-visit-button"
import { Drawer } from "@/app/components/ui/Drawer"
import UpdateForm from "@/app/verso/forms/update-form"
import Logo from "@/app/verso/ui/Logo"
import { WeatherWidget } from "@/app/verso/home/weather-widget"
import { NextVisitWidget } from "@/app/verso/home/next-visit-widget"
import { UpdatesWidget } from "@/app/verso/home/updates-widget"
import { RecentExpensesWidget } from "@/app/verso/home/recent-expenses-widget"
import { OnThisDay } from "@/app/verso/historia/on-this-day"
import type { OnThisDay as OnThisDayData } from "@/app/lib/dal"
import Link from "next/link"

const HomeView = ({ onThisDay }: { onThisDay: OnThisDayData | null }) => {
  const { selectedFacility } = useFacilities()
  const { bookings } = useBookingData()
  if (!selectedFacility) {
    return (
      <div className="flex min-h-[70vh] flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <Logo className="h-24 w-auto text-accent/25" />
        <p className="mt-8 text-sm text-text-faint">
          Välkommen till Origo
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-text sm:text-5xl">
          Välj en anläggning
        </h1>
        <p className="mt-4 max-w-md text-base leading-7 text-text-muted">
          Välj en anläggning i sidomenyn för att se planering, besök och ekonomi.
        </p>
      </div>
    )
  }
  const nextVisit = bookings[0]
  const nextVisitLabel = nextVisit
    ? `Nästa vistelse börjar ${new Date(nextVisit.start_date).toLocaleDateString("sv-SE", { day: "numeric", month: "long" })}`
    : "Samlad översikt för huset"

  return (
    <div className="container flex min-w-0 flex-col gap-5 py-5 sm:gap-6 sm:py-8">
      <header className="flex min-w-0 flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between sm:pb-5">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-text sm:text-4xl">{selectedFacility.name}</h1>
          <p className="mt-1 text-sm text-text-muted">{nextVisitLabel}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Drawer trigger="Lägg till uppdatering" triggerVariant={"secondary"} triggerSize={'sm'} title={'Ny uppdatering'} >
            <UpdateForm />
          </Drawer>
          <BookVisitButton />
        </div>
      </header>
      <OnThisDay
        data={onThisDay}
        limit={3}
        action={
          <Link href="/historia" className="text-xs font-medium text-accent no-underline hover:underline">
            Öppna Historia
          </Link>
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:grid-rows-[14rem_12.25rem] lg:gap-5">
        <NextVisitWidget />
        <WeatherWidget facility={selectedFacility} />
        <UpdatesWidget />
        <RecentExpensesWidget />
      </div>
    </div>
  )
}


export default HomeView
