"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useUser } from "@/app/lib/user-context"
import { DesktopNav } from "./nav/desktop-nav"
import { MobileNav } from "./nav/mobile-nav"
import SpeciesSearch from "./species-search"
import QuickObservation, { type QuickObservationHandle } from "./observationer/quick-observation"

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

  // An image dragged in anywhere on Tempus opens the quick observation with it.
  // Drop zones of their own (e.g. the photo picker) call preventDefault and keep
  // their drop; while another dialog is open the drop is left alone.
  const quickObservation = useRef<QuickObservationHandle>(null)
  useEffect(() => {
    if (!user) return
    const carriesFiles = (event: DragEvent) => event.dataTransfer?.types.includes("Files") ?? false
    const onDragOver = (event: DragEvent) => {
      if (carriesFiles(event)) event.preventDefault()
    }
    const onDrop = (event: DragEvent) => {
      if (event.defaultPrevented || !carriesFiles(event)) return
      event.preventDefault()
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return
      const files = Array.from(event.dataTransfer?.files ?? [])
      if (files.some((file) => file.type.startsWith("image/"))) quickObservation.current?.open({ photos: files })
    }
    document.addEventListener("dragover", onDragOver)
    document.addEventListener("drop", onDrop)
    return () => {
      document.removeEventListener("dragover", onDragOver)
      document.removeEventListener("drop", onDrop)
    }
  }, [user])

  // A visitor without a session gets the same menu, with every page link. A
  // page that needs a session sends them to the login and back afterwards.
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
        isGuest={!user}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((current) => !current)}
      />
      <SpeciesSearch open={speciesSearchOpen} onClose={() => setSpeciesSearchOpen(false)} />
      {user ? (
        <QuickObservation ref={quickObservation} hideTrigger />
      ) : null}
    </>
  )
}
