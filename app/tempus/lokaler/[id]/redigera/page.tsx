import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getTempusLocaleItem } from "@/app/lib/dal"
import LocaleForm from "../../locale-form"

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const locale = await getTempusLocaleItem(id)
  return { title: locale ? `Redigera ${locale.name} | Platser` : "Redigera plats" }
}

export default async function EditLocalePage({ params }: PageProps) {
  const { id } = await params
  const locale = await getTempusLocaleItem(id)
  if (!locale) notFound()

  return (
    <main className="container flex flex-col gap-4 py-5 max-sm:px-4 sm:py-7">
      <Link href="/lokaler" className="w-fit font-mono text-[10px] uppercase tracking-[.16em] text-text-muted no-underline hover:text-accent">
        ← Platser
      </Link>
      <header className="border-b border-border pb-4">
        <p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">Redigera plats</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{locale.name}</h1>
      </header>
      <LocaleForm initial={locale} />
    </main>
  )
}
