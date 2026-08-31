"use client"

import type { ComponentPropsWithoutRef } from "react"
import ReactMarkdown from "react-markdown"
import type { FluxDocument } from "@/app/lib/dal"
import { MermaidDiagram } from "./mermaid-diagram"

const DIAGRAM_LANGS = new Set(["mermaid", "dbschema"])

const markdownComponents = {
  // Diagrams render as block-level elements; unwrap them from <pre>. Real code
  // blocks keep their <pre> for block styling.
  pre({ children, ...props }: ComponentPropsWithoutRef<"pre">) {
    const child = Array.isArray(children) ? children[0] : children
    const lang = /language-(\w+)/.exec(
      (child as { props?: { className?: string } } | undefined)?.props?.className ?? "",
    )?.[1]
    if (lang && DIAGRAM_LANGS.has(lang)) return <>{children}</>
    return <pre {...props}>{children}</pre>
  },
  code({ node: _node, className, children, ...props }: ComponentPropsWithoutRef<"code"> & { node?: unknown }) {
    const language = /language-(\w+)/.exec(className ?? "")?.[1]
    const value = String(children).replace(/\n$/, "")

    if (language === "mermaid") return <MermaidDiagram chart={value} />
    if (language === "dbschema") {
      return (
        <pre className="overflow-x-auto rounded-md border border-border bg-surface-2 p-3 font-mono text-xs leading-5 text-text">
          {value}
        </pre>
      )
    }

    return <code className={className} {...props}>{children}</code>
  },
}

export function DocumentContent({ document }: { document: FluxDocument }) {
  if (document.kind === "flowchart") return <MermaidDiagram chart={document.content} />

  if (document.kind === "database_schema") {
    return (
      <pre className="overflow-x-auto rounded-md border border-border bg-surface-2 p-3 font-mono text-xs leading-5 text-text">
        {document.content}
      </pre>
    )
  }

  return (
    <div className="flux-doc max-w-none">
      <ReactMarkdown components={markdownComponents}>{document.content}</ReactMarkdown>
    </div>
  )
}
