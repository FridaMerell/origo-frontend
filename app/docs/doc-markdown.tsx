"use client"

import type { ComponentPropsWithoutRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { CodeBlock } from "./code-block"

const components = {
  // Fenced code blocks render through CodeBlock (label + copy + highlight).
  pre({ children }: ComponentPropsWithoutRef<"pre">) {
    const child = Array.isArray(children) ? children[0] : children
    const props =
      (child as { props?: { className?: string; children?: unknown } } | undefined)
        ?.props ?? {}
    const language = /language-(\w+)/.exec(props.className ?? "")?.[1]
    const code = String(props.children ?? "").replace(/\n$/, "")
    return <CodeBlock language={language} code={code} />
  },
}

const PROSE = `
  leading-relaxed
  [&_h1]:mb-6 [&_h1]:mt-0 [&_h1]:text-4xl [&_h1]:font-medium [&_h1]:tracking-[-0.04em]
  [&_h2]:mb-4 [&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight
  [&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:text-lg [&_h3]:font-semibold
  [&_p]:my-4 [&_p]:text-[15px]
  [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6
  [&_li]:my-1 [&_li]:text-[15px]
  [&_a]:underline [&_a]:underline-offset-2
  [&_hr]:my-10 [&_hr]:border-[#1B252B]/20
  [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-[#1B252B]/40 [&_blockquote]:pl-4 [&_blockquote]:text-[#58636A]
  [&_:not(pre)>code]:rounded-sm [&_:not(pre)>code]:bg-[#1B252B]/8 [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-[family-name:var(--font-geist-mono)] [&_:not(pre)>code]:text-[0.85em]
  [&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[14px]
  [&_th]:border [&_th]:border-[#1B252B]/25 [&_th]:bg-[#1B252B]/5 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
  [&_td]:border [&_td]:border-[#1B252B]/20 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top
`
  .replace(/\s+/g, " ")
  .trim()

export function DocMarkdown({ content }: { content: string }) {
  return (
    <article className={PROSE}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </article>
  )
}
