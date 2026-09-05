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

const HomeView = () => {
  const { selectedFacility } = useFacilities()
  if (!selectedFacility) {
    return (
      <div className="flex min-h-[70vh] flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <Logo className="h-24 w-auto text-accent/25" />
        <p className="mt-8 font-display text-sm uppercase tracking-[0.3em] text-text-faint">
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
  return (
    <div className="flex flex-col gap-4 px-4 sm:px-10 py-5">
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-display">Dashboard för {selectedFacility.name}</h1>
        <div className="flex flex-wrap gap-2">
          <Drawer trigger="Lägg till uppdatering" triggerVariant={"secondary"} triggerSize={'sm'} title={'Ny uppdatering'} >
            <UpdateForm />
          </Drawer>
          <BookVisitButton />
        </div>
      </div>
      <div className="grid grid-cols-6 gap-4">
        <NextVisitWidget />
        <WeatherWidget facility={selectedFacility} />
        <UpdatesWidget />
        <RecentExpensesWidget />
      </div>
    </div>
  )
}


export default HomeView
