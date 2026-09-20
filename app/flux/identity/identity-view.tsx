"use client"

import { useState } from "react"
import { EyeIcon, PencilIcon, PlusIcon } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { DeleteButton } from "@/app/components/ui/DeleteButton"
import { deleteIdentity, setProjectIdentity } from "@/app/actions/flux/identities"
import { fieldInputClass } from "@/app/components/form/Field"
import { useFluxProjectActions, useSelectedFluxProject } from "@/app/flux/_state/flux-context"
import { ProjectFormDrawer } from "@/app/flux/projects/project-form-drawer"
import { useUser } from "@/app/lib/user-context"
import type { FluxIdentity } from "@/app/lib/dal"
import { IdentityEditor } from "./identity-editor"
import { IdentityPreview } from "./identity-preview"

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

  const removeIdentity = async (identity: FluxIdentity) => {
    const snapshot = identities
    setIdentities((prev) => prev.filter((item) => item.id !== identity.id))
    const result = await deleteIdentity(identity.id)
    if (result?.error) {
      setIdentities(snapshot)
      setError(result.error)
      return
    }
    // The project keeps include_identity but loses the identity, matching the server.
    if (selectedProject.identity === identity.id) replaceProject({ ...selectedProject, identity: null })
  }

  return (
    <div className="flex flex-col gap-8">
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-faint">Projektets identitet</h2>

        <div className="flex flex-wrap items-center gap-2">
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
          {current && (
            <Button variant="secondary" size="sm" onClick={() => setEditor({ identity: current })}>
              {isOwner(current) ? <PencilIcon size={14} /> : <EyeIcon size={14} />}
              {isOwner(current) ? "Redigera" : "Visa"}
            </Button>
          )}
        </div>

        {current ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-text-muted">
              <span className="font-medium text-text">{current.name}</span>
              {current.brand_name && ` · ${current.brand_name}`} · {THEME_LABELS[current.theme_modes]}
              {!isOwner(current) && " · delad med dig"}
            </p>
            <IdentityPreview identity={current} accessibilityTarget={current.accessibility_target} height="30rem" />
          </div>
        ) : (
          <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-text-muted">
            Projektet har ingen identitet än. Välj en i listan eller skapa en ny nedan.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-faint">Bibliotek</h2>
          <Button variant="secondary" size="sm" onClick={() => setEditor({})}>
            <PlusIcon size={14} />
            Ny identitet
          </Button>
        </div>

        {identities.length === 0 ? (
          <p className="text-sm text-text-muted">Inga identiteter än.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {identities.map((identity) => (
              <li key={identity.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 text-sm">
                  <span className="font-medium text-text">{identity.name}</span>
                  <span className="ml-2 text-xs text-text-faint">
                    {THEME_LABELS[identity.theme_modes]} · {isOwner(identity) ? "Din" : "Delad med dig"}
                    {identity.id === selectedProject.identity && " · används av projektet"}
                  </span>
                  {identity.colors.length > 0 && (
                    <span className="mt-1.5 flex gap-1" aria-hidden="true">
                      {identity.colors.slice(0, 8).map((color, index) => (
                        <span
                          key={`${color.name}-${index}`}
                          className="size-4 rounded-full border border-border"
                          style={{ backgroundColor: /^#[0-9a-f]{6}$/i.test(color.light || color.dark) ? color.light || color.dark : "transparent" }}
                        />
                      ))}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {isOwner(identity) && identity.id !== selectedProject.identity && (
                    <Button variant="secondary" size="sm" disabled={pending} onClick={() => chooseIdentity(identity.id)}>Använd</Button>
                  )}
                  <button
                    type="button"
                    aria-label={isOwner(identity) ? "Redigera identitet" : "Visa identitet"}
                    className="rounded-md p-1 text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
                    onClick={() => setEditor({ identity })}
                  >
                    {isOwner(identity) ? <PencilIcon size={14} /> : <EyeIcon size={14} />}
                  </button>
                  {isOwner(identity) && (
                    <DeleteButton
                      label="Ta bort identitet"
                      confirmTitle="Ta bort identitet"
                      confirmMessage="Ta bort identiteten? Projekt som använder den behålls men förlorar sin identitet, och det går inte att ångra. Antalet projekt som använder den visas inte här."
                      showTitle
                      className="rounded-md p-1 text-text-faint transition-colors hover:bg-danger-wash hover:text-danger disabled:opacity-50"
                      onDelete={() => removeIdentity(identity)}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

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
