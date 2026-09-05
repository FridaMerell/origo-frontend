"use client"

import { useState } from "react"
import { Drawer } from "../components/ui/Drawer"
import { SidebarContent, type SidebarProps } from "./sidebar"
import Logo from "./ui/Logo"
import { Menu } from "lucide-react"

export default function MobileNav({ mode, onToggleMode }: SidebarProps) {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-3 py-2 md:hidden">
      <a href="/" className="flex items-center font-display text-lg font-semibold text-accent">
        <Logo height={32} />
        <span className="ml-1">Verso</span>
      </a>
      <button
        type="button"
        aria-label="Öppna meny"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center rounded p-2 text-text hover:bg-accent-wash hover:text-accent"
      >
        <Menu size={22} />
      </button>

      <Drawer side="left" title="Meny" open={open} onOpenChange={setOpen}>
        <SidebarContent mode={mode} onToggleMode={onToggleMode} onNavigate={() => setOpen(false)} />
      </Drawer>
    </header>
  )
}
