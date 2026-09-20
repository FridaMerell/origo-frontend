"use client"

import { useState } from "react"
import { createPhotoTag } from "@/app/actions/photo"
import { fieldInputClass } from "@/app/components/form/Field"
import { Button } from "@/app/components/ui/Button"
import { useDrawerClose } from "@/app/components/ui/Drawer"

export function TagForm() {
  const closeDrawer = useDrawerClose()
  const [name, setName] = useState("")
  const [error, setError] = useState<string | undefined>()
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    const result = await createPhotoTag(name)
    setPending(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    closeDrawer()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Namn
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={fieldInputClass}
        />
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="mt-2 flex justify-end">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Skapar..." : "Skapa"}
        </Button>
      </div>
    </form>
  )
}
