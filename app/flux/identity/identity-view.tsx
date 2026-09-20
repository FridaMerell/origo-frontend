"use client"

import { useState } from "react"
import { EyeIcon, PencilIcon, PlusIcon } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { setProjectIdentity } from "@/app/actions/flux/identities"
import { fieldInputClass } from "@/app/components/form/Field"
import { useFluxProjectActions, useSelectedFluxProject } from "@/app/flux/_state/flux-context"
import { ProjectFormDrawer } from "@/app/flux/projects/project-form-drawer"
import { useUser } from "@/app/lib/user-context"
import type { FluxIdentity } from "@/app/lib/dal"
import { IdentityEditor } from "./identity-editor"
import { IdentityBrandIntro } from "./identity-brand-intro"
import { colorValue, isHex } from "./identity-utils"

const THEME_LABELS = { light: "Ljust", dark: "Mörkt", both: "Ljust och mörkt" } as const

function upsert(items: FluxIdentity[], item: FluxIdentity): FluxIdentity[] {
  return items.some((existing) => existing.id === item.id)
    ? items.map((existing) => (existing.id === item.id ? item : existing))
    : [...items, item]
}

export function IdentityView({ initialIdentities }: { initialIdentities: FluxIdentity[] }) {
  const user = useUser()
  const { selectedProject } = useSelectedFluxProject()
  const { replaceProject } = useFluxProjectActions()
  const [identities, setIdentities] = useState(initialIdentities)
  const [editor, setEditor] = useState<{ identity?: FluxIdentity } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [choice, setChoice] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (!selectedProject) {
    return <p className="text-sm text-text-muted">Inget projekt valt.</p>
  }

  if (!selectedProject.include_identity) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-5">
        <p className="text-sm text-text-muted">
          Projektet använder ingen visuell identitet. Slå på det i projektinställningarna för att välja en identitet och generera designfiler.
        </p>
        <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>Öppna projektinställningar</Button>
        <ProjectFormDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} project={selectedProject} />
      </div>
    )
  }

  const isOwner = (identity: FluxIdentity) => user !== null && identity.owner === user.id
  const current = identities.find((identity) => identity.id === selectedProject.identity) ?? null
  // Only identities you own can be chosen, plus the one the project already has.
  const choosable = identities.filter((identity) => isOwner(identity) || identity.id === selectedProject.identity)

  const chooseIdentity = async (id: number) => {
    setPending(true)
    setError(null)
    const result = await setProjectIdentity(selectedProject.id, { include_identity: true, identity: id })
    setPending(false)
    if (result?.error || !result?.data) {
      setError(result?.error ?? "Identiteten kunde inte väljas.")
      return
    }
    replaceProject(result.data)
    setChoice("")
  }

  return (
    <div className="flex flex-col gap-10">
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <section className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-faint">Projektets identitet</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-text">
              {current?.brand_name || current?.name || "Ge projektet ett visuellt uttryck"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              {current?.description || "Välj eller skapa en identitet för att samla färger, typografi och visuella byggstenar på ett ställe."}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {current && (
              <Button variant="secondary" size="sm" onClick={() => setEditor({ identity: current })}>
                {isOwner(current) ? <PencilIcon size={14} /> : <EyeIcon size={14} />}
                {isOwner(current) ? "Redigera" : "Visa"}
              </Button>
            )}
            <Button variant={current ? "secondary" : "primary"} size="sm" onClick={() => setEditor({})}>
              <PlusIcon size={14} />
              Ny identitet
            </Button>
          </div>
        </div>

        {current && (
          <div className="flex flex-wrap gap-2 text-xs font-medium text-text-muted">
            <span className="rounded-full border border-border bg-bg px-2.5 py-1">{THEME_LABELS[current.theme_modes]}</span>
            <span className="rounded-full border border-border bg-bg px-2.5 py-1">WCAG {current.accessibility_target}</span>
            {!isOwner(current) && <span className="rounded-full border border-border bg-bg px-2.5 py-1">Delad med dig</span>}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <select
            aria-label="Välj identitet"
            className={`${fieldInputClass} min-w-56`}
            value={choice}
            onChange={(event) => setChoice(event.target.value)}
          >
            <option value="">{current ? `Byt från ${current.name}` : "Välj identitet"}</option>
            {choosable
              .filter((identity) => identity.id !== selectedProject.identity)
              .map((identity) => <option key={identity.id} value={identity.id}>{identity.name}</option>)}
          </select>
          <Button variant="secondary" size="sm" disabled={!choice || pending} onClick={() => chooseIdentity(Number(choice))}>
            Använd
          </Button>
        </div>
      </section>

      {current ? (
        <>
          <section className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-faint">Introduktion</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-text">Varumärket i praktiken</h2>
              <p className="mt-1 text-sm text-text-muted">En visuell introduktion till hur identiteten möter människor i innehåll, handlingar och vardagliga gränssnitt.</p>
            </div>
            <IdentityBrandIntro identity={current} />
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">Färgpalett</p>
              <div className="mt-3 flex flex-wrap gap-1.5" aria-label={`${current.colors.length} färger`}>
                {current.colors.slice(0, 10).map((color, index) => {
                  const value = colorValue(color, current.theme_modes === "dark" ? "dark" : "light")
                  return <span key={`${color.name}-${index}`} className="size-6 rounded-md border border-border" style={{ backgroundColor: isHex(value) ? value : "transparent" }} title={color.name || value} />
                })}
                {current.colors.length === 0 && <span className="text-sm text-text-muted">Inga färger ännu</span>}
              </div>
              <p className="mt-3 text-sm text-text-muted">{current.colors.length} färger för ytor, text och tillstånd.</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">Typografi</p>
              <p className="mt-3 truncate font-display text-lg font-semibold text-text" title={current.heading_font}>{current.heading_font || "Systemfont"}</p>
              <p className="mt-1 truncate text-sm text-text-muted" title={current.body_font}>{current.body_font || "Systemfont"}</p>
              <p className="mt-3 text-sm text-text-muted">Rubriker och brödtext i samma visuella ton.</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">Tonalitet</p>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-text-muted">{current.tone || "Lägg till tonalitet för att guida språk och innehåll."}</p>
              <p className="mt-3 text-sm text-text-muted">Använd den som riktning för innehåll och mikrocopy.</p>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-xl border border-dashed border-border bg-surface px-5 py-12 text-center">
          <h2 className="font-display text-xl font-semibold text-text">Ingen identitet vald</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">Välj en identitet ovan eller skapa en ny för att börja samla projektets visuella riktning.</p>
        </section>
      )}

      {editor && (
        <IdentityEditor
          identity={editor.identity}
          readOnly={editor.identity ? !isOwner(editor.identity) : false}
          onClose={() => setEditor(null)}
          onSaved={(saved) => setIdentities((prev) => upsert(prev, saved))}
        />
      )}
    </div>
  )
}
