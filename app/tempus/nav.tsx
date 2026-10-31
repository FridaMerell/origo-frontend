"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useUser } from "@/app/lib/user-context"
import { DesktopNav } from "./nav/desktop-nav"
import { MobileNav } from "./nav/mobile-nav"
import SpeciesSearch from "./species-search"
import QuickObservation, { type QuickObservationHandle } from "./observationer/quick-observation"
import { usePagerArrowKeys } from "./use-pager-arrow-keys"

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

  usePagerArrowKeys()

  // Ctrl/Cmd+K opens and closes the species search. While another dialog is open,
  // such as the quick observation, the keys are left alone.
  useEffect(() => {
    if (!user) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey) return
      if (!speciesSearchOpen && document.querySelector('[aria-modal="true"]')) return
      event.preventDefault()
      setSpeciesSearchOpen(!speciesSearchOpen)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [speciesSearchOpen, user])

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

  // Ctrl+Space opens the quick observation, unless a dialog is already open.
  useEffect(() => {
    if (!user) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || !event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      if (document.querySelector('[aria-modal="true"]')) return
      event.preventDefault()
      quickObservation.current?.open({})
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
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
      {speciesSearchOpen ? <SpeciesSearch open onClose={() => setSpeciesSearchOpen(false)} /> : null}
      {user ? (
        <QuickObservation ref={quickObservation} hideTrigger />
      ) : null}
    </>
  )
}
