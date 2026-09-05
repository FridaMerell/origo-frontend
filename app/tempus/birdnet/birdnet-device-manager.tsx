"use client"

import { useMemo, useState, useTransition } from "react"
import { createBirdnetDevice, updateBirdnetDevice } from "@/app/actions/birdnet"
import { Card } from "@/app/components/ui/Card"
import type { BirdnetDevice, BirdnetDeviceInput, Facility, FluxUser } from "@/app/lib/dal"
import { formatUserName } from "@/app/lib/user-context"
import { ChevronRight, Loader, Plus } from "lucide-react"

type EditorState = BirdnetDeviceInput & { id: string | null }

function createEditor(currentUserId: number | null): EditorState {
  return {
    id: null,
    identifier: "",
    name: "",
    users: currentUserId ? [currentUserId] : [],
    house: null,
    is_active: true,
  }
}

function editDevice(device: BirdnetDevice): EditorState {
  return {
    id: device.id,
    identifier: device.identifier,
    name: device.name,
    users: device.users,
    house: device.house,
    is_active: device.is_active,
  }
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "Okänt datum"
    : date.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })
}

const fieldClass = "w-full rounded border border-field-border bg-surface px-3 py-2.5 text-sm font-normal text-text placeholder:text-text-faint focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"

export default function BirdnetDeviceManager({
  devices,
  loadError,
  houses,
  users,
  currentUserId,
}: {
  devices: BirdnetDevice[]
  loadError: string | null
  houses: Facility[]
  users: FluxUser[]
  currentUserId: number | null
}) {
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const activeCount = devices.filter((device) => device.is_active).length

  const selectedHouse = houses.find((house) => house.id === editor?.house) ?? null
  const selectableUsers = useMemo(() => {
    if (!selectedHouse) return users
    const memberIds = new Set(selectedHouse.members.map(String))
    return users.filter((user) => memberIds.has(String(user.id)))
  }, [selectedHouse, users])

  const startCreate = () => {
    setError(null)
    setEditor(createEditor(currentUserId))
  }

  const startEdit = (device: BirdnetDevice) => {
    setError(null)
    setEditor(editDevice(device))
  }

  const changeHouse = (houseId: string) => {
    const house = houses.find((item) => item.id === houseId)
    const memberIds = house ? new Set(house.members.map(String)) : null
    setEditor((current) => current ? {
      ...current,
      house: houseId || null,
      users: memberIds
        ? current.users.filter((id) => memberIds.has(String(id)))
        : current.users,
    } : current)
  }

  const toggleUser = (userId: number) => {
    setEditor((current) => {
      if (!current) return current
      return {
        ...current,
        users: current.users.includes(userId)
          ? current.users.filter((id) => id !== userId)
          : [...current.users, userId],
      }
    })
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editor) return
    setError(null)
    startTransition(async () => {
      const result = editor.id
        ? await updateBirdnetDevice(editor.id, editor)
        : await createBirdnetDevice(editor)
      if (result.error) {
        setError(result.error)
        return
      }
      setEditor(null)
    })
  }

  return (
    <div className="mx-auto flex container flex-col gap-8   py-6   sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-accent">BirdNET</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            Lyssningsenheter
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-text-muted">
            Registrera enheter och styr vilka användare och hus de hör till.
          </p>
        </div>
        <Card className="shrink-0 px-5 py-4">
          <span className="font-mono text-[10px] uppercase tracking-[.16em] text-text-faint">Enhetsstatus</span>
          <strong className="mt-1 block font-display text-4xl font-semibold text-accent">
            {activeCount} <span className="text-2xl text-text-faint">/ {devices.length}</span>
          </strong>
          <span className="text-sm text-text-muted">aktiva enheter</span>
        </Card>
      </header>

      {loadError ? (
        <Card className="border-l-4 border-l-danger px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-danger">Kunde inte läsa enheter</p>
          <p className="mt-2 text-sm text-text-muted">{loadError}</p>
        </Card>
      ) : null}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.16em] text-text-faint">BirdNET · konfiguration</p>
            <h2 className="mt-1 font-display text-xl font-semibold">Registrerade enheter</h2>
          </div>
          <button
            type="button"
            onClick={startCreate}
            disabled={editor !== null || loadError !== null}
            className="inline-flex items-center gap-2 rounded bg-accent px-4 py-2.5 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} /> Ny enhet
          </button>
        </div>

        {editor ? (
          <Card className="mb-4 overflow-hidden border-t-4 border-t-accent p-0">
            <form onSubmit={submit}>
              <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[.16em] text-accent">
                    {editor.id ? "Befintlig enhet" : "Ny enhet"}
                  </p>
                  <h3 className="mt-1 font-display text-xl font-semibold">
                    {editor.id ? editor.name : "Registrera BirdNET-enhet"}
                  </h3>
                </div>
                <button type="button" onClick={() => setEditor(null)} className="shrink-0 text-sm text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-focus-ring">
                  Stäng
                </button>
              </header>

              <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Namn
                  <input required value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} placeholder="Mikrofon vid fågelbordet" className={fieldClass} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Enhets-ID
                  <input required value={editor.identifier} onChange={(event) => setEditor({ ...editor, identifier: event.target.value })} placeholder="pi-birdnet-001" className={`${fieldClass} font-mono`} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Hus <span className="font-normal text-text-faint">(valfritt)</span>
                  <select value={editor.house ?? ""} onChange={(event) => changeHouse(event.target.value)} className={fieldClass}>
                    <option value="">Inget hus</option>
                    {houses.map((house) => <option key={house.id} value={house.id}>{house.name}</option>)}
                  </select>
                  <span className="font-mono text-[10px] font-normal uppercase tracking-wide text-text-faint">Valt hus begränsar användarlistan till husets medlemmar</span>
                </label>
                <fieldset>
                  <legend className="mb-1.5 text-sm font-medium">Användare</legend>
                  <div className="max-h-40 overflow-y-auto rounded border border-border bg-surface">
                    {selectableUsers.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-text-muted">Inga valbara användare.</p>
                    ) : selectableUsers.map((user) => (
                      <label key={user.id} className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-2.5 text-sm last:border-b-0 hover:bg-accent-wash">
                        <input type="checkbox" checked={editor.users.includes(user.id)} onChange={() => toggleUser(user.id)} className="size-4 accent-[var(--accent)]" />
                        <span className="min-w-0 flex-1 truncate">{formatUserName(user)}</span>
                        {user.id === currentUserId ? <span className="font-mono text-[9px] uppercase text-text-faint">Du</span> : null}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="flex items-center gap-3 border-t border-border pt-4 text-sm lg:col-span-2">
                  <input type="checkbox" checked={editor.is_active} onChange={(event) => setEditor({ ...editor, is_active: event.target.checked })} className="size-4 accent-[var(--accent)]" />
                  <span><strong className="font-medium">Aktiv enhet</strong><span className="ml-2 text-text-muted">Aktiva enheter får skicka detectioner.</span></span>
                </label>
              </div>

              <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-border px-5 py-4 sm:px-6">
                {error ? <p role="alert" className="mr-auto text-sm text-danger">{error}</p> : null}
                <button type="button" onClick={() => setEditor(null)} disabled={pending} className="px-3 py-2 text-sm text-text-muted hover:text-text disabled:opacity-50">Avbryt</button>
                <button type="submit" disabled={pending || !editor.name.trim() || !editor.identifier.trim() || editor.users.length === 0} className="inline-flex items-center gap-2 rounded bg-accent px-4 py-2.5 text-sm font-semibold text-accent-contrast hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-50">
                  {pending ? <Loader size={16} className="animate-spin" /> : null}
                  {pending ? "Sparar…" : "Spara enhet"}
                </button>
              </footer>
            </form>
          </Card>
        ) : null}

        {!loadError && devices.length === 0 ? (
          <Card className="border-dashed px-6 py-10 text-center">
            <p className="font-display text-lg font-semibold">Inga enheter registrerade</p>
            <p className="mt-2 text-sm text-text-muted">Lägg till en BirdNET-enhet för att börja ta emot detectioner.</p>
            <button type="button" onClick={startCreate} className="mt-4 text-sm text-accent hover:underline">Registrera den första enheten</button>
          </Card>
        ) : !loadError ? (
          <Card className="overflow-hidden p-0">
            <ul>
              {devices.map((device) => {
                const house = houses.find((item) => item.id === device.house)
                return (
                  <li key={device.id} className="border-b border-border last:border-b-0">
                    <button type="button" onClick={() => startEdit(device)} disabled={editor !== null} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent-wash focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus-ring disabled:cursor-default sm:grid-cols-[minmax(0,1.4fr)_minmax(8rem,0.8fr)_7rem_auto] sm:px-5">
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className={`size-2 shrink-0 rounded-full ${device.is_active ? "bg-success" : "bg-text-faint"}`} />
                          <span className="truncate text-sm font-medium text-text">{device.name}</span>
                        </span>
                        <span className="ml-4 block truncate font-mono text-[10px] uppercase tracking-wide text-text-faint">{device.identifier}</span>
                      </span>
                      <span className="hidden min-w-0 sm:block">
                        <span className="block truncate text-sm text-text-muted">{house?.name ?? "Inget hus"}</span>
                        <span className="block font-mono text-[10px] uppercase tracking-wide text-text-faint">{device.users.length} användare</span>
                      </span>
                      <span className="hidden font-mono text-[10px] uppercase tracking-wide text-text-faint sm:block">{formatDate(device.updated_at)}</span>
                      <ChevronRight size={15} className="text-text-faint" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>
        ) : null}
      </section>
    </div>
  )
}
