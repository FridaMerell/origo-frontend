"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@/app/components/form/zodResolver"
import { saveRole } from "@/app/actions/flux/design"
import { fluxRoleFormSchema, type FluxRoleFormValues } from "@/app/lib/schemas"
import { Drawer } from "@/app/components/ui/Drawer"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import type { FluxRole } from "@/app/lib/dal"

export function RoleFormDrawer({
  open,
  onClose,
  projectId,
  role,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  projectId: number
  role?: FluxRole
  onSaved: (role: FluxRole) => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FluxRoleFormValues>({
    resolver: zodResolver(fluxRoleFormSchema),
    defaultValues: { name: role?.name ?? "", description: role?.description ?? "" },
  })

  useEffect(() => {
    if (!open) return
    reset({ name: role?.name ?? "", description: role?.description ?? "" })
  }, [open, role, reset])

  const onSubmit = handleSubmit(async (data) => {
    const result = await saveRole(projectId, role?.id ?? null, data)
    if (result?.error || !result?.data) {
      setError("root", { message: result?.error ?? "Rollen kunde inte sparas." })
      return
    }
    onSaved(result.data)
    onClose()
  })

  return (
    <Drawer
      title={role ? "Redigera roll" : "Ny roll"}
      open={open}
      onOpenChange={(next) => !next && onClose()}
      panelClassName="max-w-4xl"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4.5">
        <Field label="Namn" error={errors.name}>
          <input type="text" placeholder="t.ex. Administratör" className={fieldInputClass} {...register("name")} />
        </Field>
        <Field label="Beskrivning" error={errors.description}>
          <textarea rows={3} className={fieldInputClass} {...register("description")} />
        </Field>
        <FormRootError error={errors.root} />
        <FormActions
          isSubmitting={isSubmitting}
          submitLabel={role ? "Spara" : "Skapa roll"}
          onCancel={onClose}
          size="md"
          className="flex items-center justify-end gap-2.5 pt-2"
        />
      </form>
    </Drawer>
  )
}
