"use client"

import { Chip } from "@/app/components/ui/Chip"
import { useTempusLocales } from "@/app/tempus/_state/tempus-context"

export function LocaleLabel({ localeId, chip = false }: { localeId: number | string | null; chip?: boolean }) {
  const locales = useTempusLocales()
  const name = locales.find((locale) => String(locale.id) === String(localeId))?.name
  if (!name) return <span>—</span>
  return chip ? <Chip variant="neutral" className="px-2 py-0.5 text-[10px]">{name}</Chip> : <span>{name}</span>
}
