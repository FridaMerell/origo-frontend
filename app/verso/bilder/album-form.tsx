"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { zodResolver } from "@/app/components/form/zodResolver"
import { createAlbum, deleteAlbum, updateAlbum } from "@/app/actions/photo"
import { Button } from "@/app/components/ui/Button"
import { albumFormSchema, type AlbumFormValues } from "@/app/lib/schemas"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { useSubmitAction } from "@/app/components/form/useSubmitAction"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import { useDrawerClose } from "@/app/components/ui/Drawer"
import { useVentureData } from "@/app/verso/_state/verso-context"
import type { Album } from "@/app/lib/dal"

/** Creates an album, or edits `album` when given. */
export function AlbumForm({ album, defaultKind = "general" }: { album?: Album; defaultKind?: Album["kind"] }) {
  const { ventures } = useVentureData()
  const closeDrawer = useDrawerClose()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AlbumFormValues>({
    resolver: zodResolver(albumFormSchema),
    defaultValues: {
      name: album?.name ?? "",
      description: album?.description ?? "",
      kind: album?.kind ?? defaultKind,
      venture: album?.venture ?? "",
    },
  })
  const submit = useSubmitAction(setError)

  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const onSubmit = handleSubmit((data) =>
    submit(() => (album ? updateAlbum(album.id, data) : createAlbum(data)), closeDrawer)
  )

  async function onDelete() {
    if (!album || !window.confirm("Ta bort albumet? Bilderna i det tas inte bort.")) return
    setDeleting(true)
    const result = await deleteAlbum(album.id)
    setDeleting(false)
    if (result?.error) {
      setError("root", { message: result.error })
      return
    }
    closeDrawer()
    // The active ?album= filter would now point at an album that no longer exists.
    router.push("/bilder")
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Field label="Namn" error={errors.name}>
        <input type="text" className={fieldInputClass} {...register("name")} />
      </Field>

      <Field label="Beskrivning" error={errors.description}>
        <textarea className={fieldInputClass} {...register("description")} />
      </Field>

      <Field label="Typ" error={errors.kind}>
        <select className={fieldInputClass} {...register("kind")}>
          <option value="general">Allmänt</option>
          <option value="progress">Projektframsteg</option>
          <option value="history">Historik</option>
        </select>
      </Field>

      <Field label="Hör till projekt (valfritt)" error={errors.venture}>
        <select className={fieldInputClass} {...register("venture")}>
          <option value="">Inget projekt</option>
          {ventures.map((venture) => (
            <option key={venture.id} value={venture.id}>
              {venture.name}
            </option>
          ))}
        </select>
      </Field>

      <FormRootError error={errors.root} />
      <div className="mt-2 flex items-center justify-between">
        {album ? (
          <Button type="button" variant="ghost" size="sm" disabled={deleting} onClick={onDelete}>
            {deleting ? "Tar bort..." : "Ta bort album"}
          </Button>
        ) : (
          <span />
        )}
        <FormActions
          isSubmitting={isSubmitting}
          submitLabel={album ? "Spara" : "Skapa"}
          pendingLabel={album ? "Sparar..." : "Skapar..."}
          className="flex"
        />
      </div>
    </form>
  )
}
