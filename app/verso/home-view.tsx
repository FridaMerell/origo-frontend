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
    <div className="container flex flex-col gap-8 py-8 sm:py-10">
      <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Översikt · anläggning</p>
          <h1 className="font-display text-3xl font-semibold leading-tight text-text sm:text-4xl">
            {selectedFacility.name}
          </h1>
          <p className="text-sm text-text-muted">Läget just nu — besök, ekonomi och det senaste från teamet.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Drawer trigger="Lägg till uppdatering" triggerVariant={"secondary"} triggerSize={'sm'} title={'Ny uppdatering'} >
            <UpdateForm />
          </Drawer>
          <BookVisitButton />
        </div>
      </header>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <NextVisitWidget />
        <WeatherWidget facility={selectedFacility} />
        <UpdatesWidget />
        <RecentExpensesWidget />
      </div>
    </div>
  )
}


export default HomeView
