"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useConfirmDialog } from "@/app/components/ui/useConfirmDialog"
import { useToast } from "@/app/components/ui/ToastProvider"
import { deleteLocale } from "@/app/tempus/_actions/locales"
import { useTempusLocales } from "@/app/tempus/_state/tempus-context"

export default function LocalesView() {
  const locales = useTempusLocales()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)
  const { requestConfirm, dialog } = useConfirmDialog()
  const { toast } = useToast()

  const remove = (id: string, name: string) => {
    requestConfirm({
      title: "Ta bort plats",
      message: `Ta bort platsen \"${name}\"? Det går inte att ångra.`,
      confirmLabel: "Ta bort",
      destructive: true,
      onConfirm: () => {
        setRemovingId(id)
        startTransition(async () => {
          try {
            const result = await deleteLocale(id)
            if (result.error) {
              toast({ title: "Kunde inte ta bort platsen", description: result.error, variant: "error" })
              return
            }
            toast({ title: "Platsen är borttagen", variant: "success" })
            router.refresh()
          } finally {
            setRemovingId(null)
          }
        })
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="flex items-baseline justify-between border-b border-border pb-3">
          <h2 className="font-display text-lg font-semibold">Sparade platser</h2>
          <span className="font-mono text-[10px] uppercase tracking-[.16em] text-text-muted">{locales.length} st</span>
        </div>
        {locales.length === 0 ? (
          <p className="border-b border-border py-10 text-center text-sm text-text-muted">Du har inga sparade platser än.</p>
        ) : (
          <ul className="border-y border-border">
            {locales.map((locale, index) => (
              <li key={locale.id} className="grid gap-3 border-b border-border py-4 last:border-b-0 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center sm:gap-5">
                <span className="font-mono text-[10px] tracking-[.16em] text-text-faint">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-xl font-medium">
                    <Link href={`/lokaler/${locale.id}`} className="no-underline hover:text-accent hover:underline hover:underline-offset-4">
                      {locale.name}
                    </Link>
                  </h3>
                  <p className="mt-0.5 text-sm text-text-muted">Sparat geografiskt område</p>
                </div>
                <div className="flex items-center gap-2 sm:justify-self-end">
                  <Link
                    href={`/lokaler/${locale.id}/redigera`}
                    className="inline-flex items-center px-3 py-1.5 font-display text-sm font-medium italic tracking-wide text-accent underline underline-offset-4 hover:text-accent-hover"
                  >
                    Redigera
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(locale.id, locale.name)}
                    disabled={pending}
                    className="inline-flex items-center px-3 py-1.5 font-display text-sm font-medium italic tracking-wide text-text-muted underline underline-offset-4 hover:text-danger disabled:opacity-50"
                  >
                    {removingId === locale.id ? "Tar bort…" : "Ta bort"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {dialog}
    </div>
  )
}
