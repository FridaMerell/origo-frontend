"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useUser } from "@/app/lib/user-context"
import { DesktopNav } from "./nav/desktop-nav"
import { MobileNav } from "./nav/mobile-nav"
import SpeciesSearch from "./species-search"

type NavProps = {
  mode: "light" | "dark" | null
  onToggleMode: () => void
}

export default function Nav({ mode, onToggleMode }: NavProps) {
  const pathname = usePathname()
  const user = useUser()
  const [menuOpen, setMenuOpen] = useState(false)
  const [speciesSearchOpen, setSpeciesSearchOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [menuOpen])

  return (
    <>
      <DesktopNav
        pathname={pathname}
        user={user}
        mode={mode}
        onToggleMode={onToggleMode}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        onOpenSpeciesSearch={() => setSpeciesSearchOpen(true)}
      />

      <MobileNav
        pathname={pathname}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((current) => !current)}
      />
      <SpeciesSearch open={speciesSearchOpen} onClose={() => setSpeciesSearchOpen(false)} />
    </>
  )
}
