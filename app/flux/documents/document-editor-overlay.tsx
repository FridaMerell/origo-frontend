"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { useForm } from "react-hook-form"
import { createDocument, updateDocument } from "@/app/actions/flux/documents"
import { Button } from "@/app/components/ui/Button"
import { DownloadIcon, XIcon } from "lucide-react"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { FormRootError } from "@/app/components/form/FormFeedback"
import { useSubmitAction } from "@/app/components/form/useSubmitAction"
import { zodResolver } from "@/app/components/form/zodResolver"
import { fluxDocumentFormSchema, type FluxDocumentFormValues } from "@/app/lib/schemas"
import type { FluxDocument, FluxMilestone, FluxTask } from "@/app/lib/dal"
import { BlockEditor } from "./block-editor"
import { blockId, type DocumentBlock, parseBlocks, serializeBlocks } from "./blocks"
import { DocumentContent } from "./document-content"
import { downloadMarkdown } from "./download"

type Scope = "project" | "milestone" | "task"

export function DocumentEditorOverlay({
  onClose,
  projectId,
  milestones,
  tasks,
  document,
}: {
  onClose: () => void
  projectId: number
  milestones: FluxMilestone[]
  tasks: FluxTask[]
  document?: FluxDocument
}) {
  const pathname = usePathname()
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const [scope, setScope] = useState<Scope>(() => document?.milestone ? "milestone" : document?.task ? "task" : "project")
  const [blocks, setBlocks] = useState<DocumentBlock[]>(() => {
    // Legacy documents stored raw Mermaid / schema text under a dedicated kind.
    if (document?.kind === "flowchart") return [{ id: blockId(), type: "flowchart", content: document.content }]
    if (document?.kind === "database_schema") return [{ id: blockId(), type: "dbschema", content: document.content }]
    return parseBlocks(document?.content ?? "")
  })

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FluxDocumentFormValues>({
    resolver: zodResolver(fluxDocumentFormSchema),
    defaultValues: {
      title: document?.title ?? "",
      kind: "markdown",
      content: document?.content ?? "",
      milestone: document?.milestone ?? null,
      task: document?.task ?? null,
    },
  })
  const submit = useSubmitAction(setError)
  const title = watch("title")

  const content = serializeBlocks(blocks)
  useEffect(() => {
    setValue("content", content)
  }, [content, setValue])

  const changeScope = (next: Scope) => {
    setScope(next)
    setValue("milestone", null)
    setValue("task", null)
  }

  const previewDocument = useMemo<FluxDocument>(() => ({
    id: document?.id ?? 0,
    project: projectId,
    milestone: null,
    task: null,
    title,
    kind: "markdown",
    content,
    created_at: "",
    updated_at: "",
  }), [content, document?.id, projectId, title])

  return (
    <div
      className="fixed inset-0 z-50 flex bg-black/60 transition-opacity"
      style={{ transitionDuration: "var(--duration-normal)", transitionTimingFunction: "var(--ease-standard)", opacity: entered ? 1 : 0 }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-full w-full flex-col bg-surface shadow-lg transition-transform"
        style={{ transitionDuration: "var(--duration-normal)", transitionTimingFunction: "var(--ease-standard)", transform: entered ? "translateY(0)" : "translateY(1.5rem)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <form
          onSubmit={handleSubmit((data) => submit(
            () => document ? updateDocument(document.id, projectId, data, pathname) : createDocument(projectId, data, pathname),
            onClose
          ))}
          className="flex h-full flex-col"
        >
          <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
            <h2 className="m-0 min-w-0 truncate font-display text-lg font-semibold text-text">
              {document ? "Redigera dokument" : "Nytt dokument"}
            </h2>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => downloadMarkdown(title || "dokument", content)}
                aria-label="Ladda ner som Markdown"
                className="rounded p-1.5 text-text-muted hover:bg-surface-2 hover:text-text"
              >
                <DownloadIcon size={16} />
              </button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Sparar…" : document ? "Spara" : "Skapa dokument"}
              </Button>
              <button type="button" onClick={onClose} aria-label="Stäng" className="text-text-muted hover:text-text">
                <XIcon size={18} />
              </button>
            </div>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
            <div className="flex flex-col gap-4.5 overflow-y-auto border-b border-border p-5 lg:border-b-0 lg:border-r">
              <Field label="Rubrik" error={errors.title}>
                <input className={fieldInputClass} placeholder="t.ex. Teknisk översikt" {...register("title")} />
              </Field>

              <label className="flex flex-col gap-1 text-sm text-text-muted">
                Hör till
                <select className={fieldInputClass} value={scope} onChange={(event) => changeScope(event.target.value as Scope)}>
                  <option value="project">Hela projektet</option>
                  <option value="milestone">En milstolpe</option>
                  <option value="task">En uppgift</option>
                </select>
              </label>

              {scope === "milestone" && (
                <Field label="Milstolpe" error={errors.milestone}>
                  <select className={fieldInputClass} required {...register("milestone")}>
                    <option value="">Välj milstolpe</option>
                    {milestones.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.title}</option>)}
                  </select>
                </Field>
              )}

              {scope === "task" && (
                <Field label="Uppgift" error={errors.task}>
                  <select className={fieldInputClass} required {...register("task")}>
                    <option value="">Välj uppgift</option>
                    {tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
                  </select>
                </Field>
              )}

              <div className="flex flex-col gap-1">
                <span className="text-sm text-text-muted">Innehåll</span>
                <BlockEditor blocks={blocks} onChange={setBlocks} />
                {errors.content && <span className="text-xs text-danger">{errors.content.message}</span>}
              </div>

              <FormRootError error={errors.root} />
            </div>

            <div className="overflow-y-auto bg-surface-2 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-faint">Förhandsvisning</p>
              {content.trim()
                ? <DocumentContent document={previewDocument} />
                : <p className="text-sm text-text-muted">Skriv något så visas det här.</p>}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
