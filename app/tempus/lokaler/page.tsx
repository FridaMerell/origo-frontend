import type { Metadata } from "next"
import Link from "next/link"
import LocalesView from "./locales-view"

export const metadata: Metadata = {
  title: "Platser | Tempus",
  description: "Visa dina egna geografiska platser.",
}

export default function LocalesPage() {
  return (
    <main className="container flex flex-col gap-4 py-5 max-sm:px-4 sm:py-7">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">Platser</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Dina platser</h1>
          <p className="mt-1 text-sm text-text-muted">Namngivna områden för checklistor och observationer.</p>
        </div>
        <Link href="/lokaler/ny" className="inline-flex items-center px-3 py-1.5 font-display text-sm font-medium italic tracking-wide text-accent underline underline-offset-4 hover:text-accent-hover">
          Ny plats
        </Link>
      </header>
      <LocalesView />
    </main>
  )
}
