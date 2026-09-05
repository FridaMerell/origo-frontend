"use client"

import { useState } from "react"
import { Drawer } from "@/app/components/ui/Drawer"
import { VentureForm } from "@/app/verso/planera/venture-form"

export function AddVentureButton() {
  const [open, setOpen] = useState(false)

  return (
    <Drawer
      trigger={'Nytt projekt'}
      title="Nytt projekt"
      triggerSize={'sm'}
      open={open}
      onOpenChange={setOpen}
    >
      <VentureForm onSuccess={() => setOpen(false)} />
    </Drawer>
  )
}
