"use client"

import { useEffect, useMemo, useState } from "react"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
import { PlusIcon, Trash2Icon, XIcon } from "lucide-react"
import { zodResolver } from "@/app/components/form/zodResolver"
import { saveIdentity } from "@/app/actions/flux/identities"
import { Button } from "@/app/components/ui/Button"
import { CheckboxGroup } from "@/app/components/form/CheckboxGroup"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { FormRootError } from "@/app/components/form/FormFeedback"
import type { FluxIdentity } from "@/app/lib/dal"
import { formValuesToPreview, identityFormSchema, identityToFormValues, newIdentityValues, type IdentityFormValues } from "./identity-form"
import { AssetFileField } from "./asset-file-field"
import { COLOR_FORMATS_HINT, normalizeColor } from "./color-parse"
import { IdentityPreview } from "./identity-preview"
import { COLOR_ROLES, FONT_WEIGHTS, isHex } from "./identity-utils"
import { StandardTokensPanel } from "./standard-tokens-panel"

/** Grid columns of the colour table: swatch, name, role, then one column per mode in use, delete. */
const colorColumns = (showLight: boolean, showDark: boolean) =>
  ["2rem", "minmax(7rem,1.3fr)", "7rem", showLight ? "minmax(8rem,1fr)" : "", showDark ? "minmax(8rem,1fr)" : "", "1.5rem"].filter(Boolean).join(" ")

const THEME_LABELS = { light: "Bara ljust", dark: "Bara mörkt", both: "Ljust och mörkt" } as const
const DEFAULT_MODE_LABELS = { system: "Följer systemet", light: "Ljust", dark: "Mörkt" } as const
const ASSET_KIND_LABELS = {
  logo: "Logotyp", logo_mark: "Bildmärke", icon: "Ikon", favicon: "Favicon", illustration: "Illustration", other: "Annat",
} as const
const ASSET_MODE_LABELS = { any: "Alla bakgrunder", light: "Ljus bakgrund", dark: "Mörk bakgrund" } as const

const sectionClass = "flex flex-col gap-4 rounded-lg border border-border bg-surface p-4"
const sectionTitle = "text-sm font-semibold uppercase tracking-wide text-text-faint"
const rowButton = "rounded-md p-1 text-text-faint transition-colors hover:bg-danger-wash hover:text-danger"

/** Trails `value` by `ms`, so the preview frame does not reload on every keystroke. */
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}

export function IdentityEditor({
  identity,
  readOnly,
  onClose,
  onSaved,
}: {
  identity?: FluxIdentity
  readOnly: boolean
  onClose: () => void
  onSaved: (identity: FluxIdentity) => void
}) {
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<IdentityFormValues>({
    resolver: zodResolver(identityFormSchema),
    mode: "onChange",
    defaultValues: identity ? identityToFormValues(identity) : newIdentityValues(),
  })

  const colors = useFieldArray({ control, name: "colors" })
  const assets = useFieldArray({ control, name: "assets" })
  const radii = useFieldArray({ control, name: "radii" })
  const shadows = useFieldArray({ control, name: "shadows" })
  const shadowsDark = useFieldArray({ control, name: "shadows_dark" })

  const watched = useWatch({ control })
  const themeModes = watched.theme_modes ?? "both"
  const showLight = themeModes !== "dark"
  const showDark = themeModes !== "light"

  const previewIdentity = useDebounced(useMemo(() => formValuesToPreview(watched as Parameters<typeof formValuesToPreview>[0]), [watched]), 300)

  const onSubmit = handleSubmit(async (data) => {
    const result = await saveIdentity(identity?.id ?? null, data)
    if (result?.error || !result?.data) {
      setError("root", { message: result?.error ?? "Identiteten kunde inte sparas." })
      return
    }
    onSaved(result.data)
    onClose()
  })

  return (
    <div
      className="fixed inset-0 z-50 flex bg-black/60 transition-opacity"
      style={{ transitionDuration: "var(--duration-normal)", transitionTimingFunction: "var(--ease-standard)", opacity: entered ? 1 : 0 }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="Identitet" className="flex h-full w-full flex-col bg-bg shadow-lg">
        <form onSubmit={onSubmit} className="flex h-full flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-5 py-3">
            <h2 className="m-0 min-w-0 truncate font-display text-lg font-semibold text-text">
              {readOnly ? `Identitet: ${identity?.name ?? ""}` : identity ? "Redigera identitet" : "Ny identitet"}
            </h2>
            <div className="flex shrink-0 items-center gap-3">
              {!readOnly && (
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? "Sparar…" : identity ? "Spara" : "Skapa identitet"}
                </Button>
              )}
              <button type="button" onClick={onClose} aria-label="Stäng" className="text-text-muted hover:text-text">
                <XIcon size={18} />
              </button>
            </div>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
            <fieldset disabled={readOnly} className="m-0 flex min-w-0 flex-col gap-5 overflow-y-auto border-0 border-b border-border p-5 lg:border-b-0 lg:border-r">
              {readOnly && (
                <p className="text-sm text-text-muted">Du äger inte den här identiteten, så den kan bara läsas.</p>
              )}

              <section className={sectionClass}>
                <h3 className={sectionTitle}>Varumärke</h3>
                <Field label="Namn (i biblioteket)" error={errors.name}>
                  <input type="text" placeholder="t.ex. Origo" className={fieldInputClass} {...register("name")} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Varumärkesnamn" error={errors.brand_name}>
                    <input type="text" className={fieldInputClass} {...register("brand_name")} />
                  </Field>
                  <Field label="Slogan" error={errors.tagline}>
                    <input type="text" className={fieldInputClass} {...register("tagline")} />
                  </Field>
                </div>
                <Field label="Beskrivning" error={errors.description}>
                  <textarea rows={2} className={fieldInputClass} {...register("description")} />
                </Field>
                <Field label="Tonalitet i texter" error={errors.tone}>
                  <textarea rows={2} className={fieldInputClass} {...register("tone")} />
                </Field>
              </section>

              <section className={sectionClass}>
                <h3 className={sectionTitle}>Teman</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Teman" error={errors.theme_modes}>
                    <select className={fieldInputClass} {...register("theme_modes")}>
                      {Object.entries(THEME_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </Field>
                  {themeModes === "both" && (
                    <Field label="Standardläge" error={errors.default_mode}>
                      <select className={fieldInputClass} {...register("default_mode")}>
                        {Object.entries(DEFAULT_MODE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </Field>
                  )}
                </div>
                <Field label="Tillgänglighetsmål" error={errors.accessibility_target}>
                  <select className={fieldInputClass} {...register("accessibility_target")}>
                    <option value="AA">WCAG AA</option>
                    <option value="AAA">WCAG AAA</option>
                  </select>
                </Field>
              </section>

              <section className={sectionClass}>
                <div className="flex items-center justify-between">
                  <h3 className={sectionTitle}>Färger ({colors.fields.length})</h3>
                  <Button type="button" variant="secondary" size="sm" onClick={() => colors.append({ name: "", role: "", light: "", dark: "" })}>
                    <PlusIcon size={14} />
                    Ny färg
                  </Button>
                </div>
                <p className="text-xs text-text-muted">
                  Skriv färger som {COLOR_FORMATS_HINT}. Allt konverteras till #rrggbb, eftersom det är vad identiteten lagrar.
                  Ge färgerna roller: kontrasten räknas på text, background, surface, muted, primary och accent.
                </p>
                <StandardTokensPanel
                  themeModes={themeModes}
                  existing={(watched.colors ?? []).map((color) => ({ name: color?.name ?? "", role: color?.role ?? "" }))}
                  onAdd={(added) => colors.append(added)}
                />
                {colors.fields.length === 0 && <p className="text-sm text-text-muted">Inga färger än.</p>}
                {colors.fields.length > 0 && (
                  <div className="overflow-x-auto">
                    <div className="flex min-w-[36rem] flex-col gap-1.5" style={{ ["--color-columns" as string]: colorColumns(showLight, showDark) }}>
                      <div className="grid items-end gap-2 text-xs text-text-faint" style={{ gridTemplateColumns: "var(--color-columns)" }}>
                        <span />
                        <span>Namn</span>
                        <span>Roll</span>
                        {showLight && <span>Ljust</span>}
                        {showDark && <span>Mörkt</span>}
                        <span />
                      </div>
                      {colors.fields.map((row, index) => {
                        const rowErrors = errors.colors?.[index]
                        const light = watched.colors?.[index]?.light ?? ""
                        const dark = watched.colors?.[index]?.dark ?? ""
                        const shownLight = normalizeColor(light)
                        const shownDark = normalizeColor(dark)
                        const problem = rowErrors?.name?.message ?? rowErrors?.light?.message ?? rowErrors?.dark?.message ?? rowErrors?.role?.message
                        return (
                          <div key={row.id} className="flex flex-col gap-0.5">
                            <div className="grid items-start gap-2" style={{ gridTemplateColumns: "var(--color-columns)" }}>
                              <span className="mt-1 flex h-6 w-8 overflow-hidden rounded border border-border" aria-hidden="true">
                                {showLight && <span className="flex-1" style={{ backgroundColor: isHex(shownLight) ? shownLight : "transparent" }} />}
                                {showDark && <span className="flex-1" style={{ backgroundColor: isHex(shownDark) ? shownDark : "transparent" }} />}
                              </span>
                              <input aria-label="Namn" type="text" className={`${fieldInputClass} min-w-0`} {...register(`colors.${index}.name`)} />
                              <select aria-label="Roll" className={fieldInputClass} {...register(`colors.${index}.role`)}>
                                <option value="">Ingen</option>
                                {COLOR_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                              </select>
                              {showLight && (
                                <span className="flex min-w-0 flex-col">
                                  <input aria-label="Ljust värde" type="text" placeholder="#rrggbb" className={`${fieldInputClass} font-mono`} {...register(`colors.${index}.light`)} />
                                  {isHex(shownLight) && shownLight !== light.trim().toLowerCase() && <span className="font-mono text-[11px] text-text-faint">{shownLight}</span>}
                                </span>
                              )}
                              {showDark && (
                                <span className="flex min-w-0 flex-col">
                                  <input aria-label="Mörkt värde" type="text" placeholder="#rrggbb" className={`${fieldInputClass} font-mono`} {...register(`colors.${index}.dark`)} />
                                  {isHex(shownDark) && shownDark !== dark.trim().toLowerCase() && <span className="font-mono text-[11px] text-text-faint">{shownDark}</span>}
                                </span>
                              )}
                              <button type="button" aria-label="Ta bort färg" className={`${rowButton} mt-1 self-start`} onClick={() => colors.remove(index)}>
                                <Trash2Icon size={14} />
                              </button>
                            </div>
                            {problem && <span className="text-xs text-danger">{problem}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </section>

              <section className={sectionClass}>
                <h3 className={sectionTitle}>Typografi</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Rubrikfont" error={errors.heading_font}>
                    <input type="text" placeholder="t.ex. Fraunces" className={fieldInputClass} {...register("heading_font")} />
                  </Field>
                  <Field label="Brödfont" error={errors.body_font}>
                    <input type="text" placeholder="t.ex. Inter" className={fieldInputClass} {...register("body_font")} />
                  </Field>
                  <Field label="Monospace" error={errors.mono_font}>
                    <input type="text" className={fieldInputClass} {...register("mono_font")} />
                  </Field>
                </div>
                <Field label="Stylesheet som laddar fonterna" error={errors.font_import_url}>
                  <input type="text" placeholder="https://fonts.googleapis.com/css2?family=..." className={fieldInputClass} {...register("font_import_url")} />
                </Field>
                <Controller
                  control={control}
                  name="font_weights"
                  render={({ field }) => (
                    <CheckboxGroup
                      label="Fontvikter"
                      options={FONT_WEIGHTS.map((weight) => ({ value: weight, label: String(weight) }))}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Grundstorlek (px)" error={errors.base_font_size}>
                    <input type="number" min={8} max={32} className={fieldInputClass} {...register("base_font_size")} />
                  </Field>
                  <Field label="Skalkvot (1 till 2)" error={errors.type_scale_ratio}>
                    <input type="number" step="0.01" min={1} max={2} className={fieldInputClass} {...register("type_scale_ratio")} />
                  </Field>
                </div>
              </section>

              <section className={sectionClass}>
                <h3 className={sectionTitle}>Form</h3>
                <Field label="Avståndsenhet (px)" error={errors.spacing_unit}>
                  <input type="number" min={1} max={16} className={fieldInputClass} {...register("spacing_unit")} />
                </Field>

                <KeyValueRows
                  title="Hörnradier (px)"
                  addLabel="Ny radie"
                  rows={radii.fields}
                  keyPlaceholder="md"
                  valueType="number"
                  register={(index, part) => register(`radii.${index}.${part}` as const)}
                  rowError={(index) => errors.radii?.[index]}
                  onAdd={() => radii.append({ key: "", value: 0 })}
                  onRemove={radii.remove}
                />
                <KeyValueRows
                  title="Skuggor"
                  addLabel="Ny skugga"
                  rows={shadows.fields}
                  keyPlaceholder="card"
                  valuePlaceholder="0 1px 3px rgb(0 0 0 / 0.2)"
                  register={(index, part) => register(`shadows.${index}.${part}` as const)}
                  rowError={(index) => errors.shadows?.[index]}
                  onAdd={() => shadows.append({ key: "", value: "" })}
                  onRemove={shadows.remove}
                />
                {showDark && (
                  <KeyValueRows
                    title="Skuggor i mörkt läge (endast avvikelser)"
                    addLabel="Ny avvikelse"
                    rows={shadowsDark.fields}
                    keyPlaceholder="card"
                    valuePlaceholder="0 2px 8px rgb(0 0 0 / 0.6)"
                    register={(index, part) => register(`shadows_dark.${index}.${part}` as const)}
                    rowError={(index) => errors.shadows_dark?.[index]}
                    onAdd={() => shadowsDark.append({ key: "", value: "" })}
                    onRemove={shadowsDark.remove}
                  />
                )}
              </section>

              <section className={sectionClass}>
                <div className="flex items-center justify-between">
                  <h3 className={sectionTitle}>Logotyper och ikoner</h3>
                  <Button type="button" variant="secondary" size="sm" onClick={() => assets.append({ name: "", kind: "logo", mode: "any", url: "", usage: "" })}>
                    <PlusIcon size={14} />
                    Ny fil
                  </Button>
                </div>
                <p className="text-xs text-text-muted">
                  Ladda upp logotyper och ikoner som filer. En logotyp som bara fungerar på ljus bakgrund ska markeras som ljus.
                  Lägg till en mörk motsvarighet för mörka bakgrunder.
                </p>
                <div className="flex flex-col gap-3">
                  {assets.fields.map((row, index) => {
                    const rowErrors = errors.assets?.[index]
                    return (
                      <div key={row.id} className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-2">
                        <Field label="Namn" error={rowErrors?.name}>
                          <input type="text" className={fieldInputClass} {...register(`assets.${index}.name`)} />
                        </Field>
                        <Field label="Typ" error={rowErrors?.kind}>
                          <select className={fieldInputClass} {...register(`assets.${index}.kind`)}>
                            {Object.entries(ASSET_KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </Field>
                        <Field label="Bakgrund" error={rowErrors?.mode}>
                          <select className={fieldInputClass} {...register(`assets.${index}.mode`)}>
                            {Object.entries(ASSET_MODE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </Field>
                        <div className="sm:col-span-2">
                          <AssetFileField
                            url={watched.assets?.[index]?.url ?? ""}
                            error={rowErrors?.url?.message}
                            onUploaded={(file) => {
                              setValue(`assets.${index}.url`, file.url, { shouldDirty: true, shouldValidate: true })
                              // Name the asset after the file when it has no name yet.
                              if (!watched.assets?.[index]?.name) setValue(`assets.${index}.name`, file.name, { shouldDirty: true, shouldValidate: true })
                            }}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Field label="Användning" error={rowErrors?.usage}>
                            <input type="text" className={fieldInputClass} {...register(`assets.${index}.usage`)} />
                          </Field>
                        </div>
                        <div className="sm:col-span-2">
                          <button type="button" aria-label="Ta bort fil" className={rowButton} onClick={() => assets.remove(index)}>
                            <Trash2Icon size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <Field label="Logotypregler" error={errors.logo_rules}>
                  <textarea rows={2} placeholder="Minsta storlek, fritt utrymme, tillåtna bakgrunder" className={fieldInputClass} {...register("logo_rules")} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Ikonbibliotek" error={errors.icon_library}>
                    <input type="text" placeholder="t.ex. lucide" className={fieldInputClass} {...register("icon_library")} />
                  </Field>
                  <Field label="Ikonstil" error={errors.icon_style}>
                    <input type="text" placeholder="t.ex. outline" className={fieldInputClass} {...register("icon_style")} />
                  </Field>
                </div>
              </section>

              <section className={sectionClass}>
                <h3 className={sectionTitle}>Riktlinjer</h3>
                <Field label="Fri Markdown" error={errors.guidelines}>
                  <textarea rows={6} className={fieldInputClass} {...register("guidelines")} />
                </Field>
              </section>

              <FormRootError error={errors.root} />
            </fieldset>

            <div className="min-w-0 overflow-y-auto bg-surface-2 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-faint">Förhandsvisning</p>
              <IdentityPreview identity={previewIdentity} accessibilityTarget={watched.accessibility_target ?? "AA"} />
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

type Part = "key" | "value"

function KeyValueRows({
  title,
  addLabel,
  rows,
  keyPlaceholder,
  valuePlaceholder,
  valueType = "text",
  register,
  rowError,
  onAdd,
  onRemove,
}: {
  title: string
  addLabel: string
  rows: { id: string }[]
  keyPlaceholder: string
  valuePlaceholder?: string
  valueType?: "text" | "number"
  register: (index: number, part: Part) => ReturnType<ReturnType<typeof useForm<IdentityFormValues>>["register"]>
  rowError: (index: number) => { key?: { message?: string }; value?: { message?: string } } | undefined
  onAdd: () => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-muted">{title}</span>
        <Button type="button" variant="secondary" size="sm" onClick={onAdd}>
          <PlusIcon size={14} />
          {addLabel}
        </Button>
      </div>
      {rows.map((row, index) => {
        const error = rowError(index)
        return (
          <div key={row.id} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <input aria-label="Nyckel" type="text" placeholder={keyPlaceholder} className={`${fieldInputClass} w-28 shrink-0`} {...register(index, "key")} />
              <input aria-label="Värde" type={valueType} placeholder={valuePlaceholder} className={`${fieldInputClass} min-w-0 flex-1`} {...register(index, "value")} />
              <button type="button" aria-label="Ta bort rad" className={rowButton} onClick={() => onRemove(index)}>
                <Trash2Icon size={14} />
              </button>
            </div>
            {(error?.key?.message || error?.value?.message) && (
              <span className="text-xs text-danger">{error.key?.message ?? error.value?.message}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
