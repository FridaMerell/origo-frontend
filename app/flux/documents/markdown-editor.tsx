"use client"

import dynamic from "next/dynamic"

const MarkdownEditorClient = dynamic(
  () => import("./markdown-editor-client").then((module) => module.MarkdownEditorClient),
  { ssr: false, loading: () => <div className="min-h-[360px] animate-pulse rounded border border-border bg-surface-2" /> }
)

export function MarkdownEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <MarkdownEditorClient value={value} onChange={onChange} />
}
