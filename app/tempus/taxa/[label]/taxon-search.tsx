"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"

export default function TaxonSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get("s") ?? ""

  const [value, setValue] = useState(current)
  const initial = useRef(current)

  useEffect(() => {
    if (value === initial.current) return
    const timer = setTimeout(() => {
      initial.current = value
      const next = new URLSearchParams(searchParams)
      if (value.trim()) {
        next.set("s", value.trim())
      } else {
        next.delete("s")
      }
      next.delete("p")
      router.replace(`${pathname}?${next.toString()}`)
    }, 300)
    return () => clearTimeout(timer)
  }, [value, pathname, router, searchParams])

  return (
    <div className="relative w-full md:max-w-xs">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint">
        <Search size={16} />
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Sök art"
        className="w-full rounded border border-field-border bg-surface py-2 pl-9 pr-3 text-text placeholder:text-text-faint"
      />
    </div>
  )
}
