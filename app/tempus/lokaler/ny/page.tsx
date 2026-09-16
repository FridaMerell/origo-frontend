import type { Metadata } from "next"
import Link from "next/link"
import LocaleForm from "../locale-form"

export const metadata: Metadata = {
  title: "Ny plats | Tempus",
  description: "Skapa en geografisk plats för checklistor och observationer.",
}

export default function NewLocalePage() {
  return (
    <main className="container flex flex-col gap-4 py-5 max-sm:px-4 sm:py-7">
      <Link href="/lokaler" className="w-fit font-mono text-[10px] uppercase tracking-[.16em] text-text-muted no-underline hover:text-accent">
        ← Platser
      </Link>
      <header className="border-b border-border pb-4">
        <p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">Ny plats</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Skapa en plats</h1>
      </header>
      <LocaleForm />
    </main>
  )
}
