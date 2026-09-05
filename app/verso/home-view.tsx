'use client'
import { useFacilities } from "./_state/facility-context"
import { BookVisitButton } from "./besok/book-visit-button"
import { Drawer } from "../components/ui/Drawer"
import UpdateForm from "./update-form"
import Logo from "./ui/Logo"
import { WeatherWidget } from "./weather-widget"
import { NextVisitWidget } from "./next-visit-widget"
import { UpdatesWidget } from "./home/updates-widget"
import { RecentExpensesWidget } from "./home/recent-expenses-widget"
import { useBookingData } from "./_state/booking-context"

const HomeView = () => {
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
    <div className="container flex flex-col gap-6 py-6 sm:py-8">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-text">{selectedFacility.name}</h1>
          <p className="mt-1 text-sm text-text-muted">{nextVisitLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Drawer trigger="Lägg till uppdatering" triggerVariant={"secondary"} triggerSize={'sm'} title={'Ny uppdatering'} >
            <UpdateForm />
          </Drawer>
          <BookVisitButton />
        </div>
      </header>
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
