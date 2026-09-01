"use client"

import { useState } from "react"

const LABELS: Record<string, string> = {
  csharp: "C#",
  cs: "C#",
  http: "HTTP",
  json: "JSON",
  bash: "Shell",
  sh: "Shell",
  ts: "TypeScript",
  tsx: "TypeScript",
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

// Language-agnostic tokeniser: comments, strings, numbers and a small set of
// keywords. Runs on already-escaped text and only ever inserts our own spans,
// so the result is safe to render as HTML. Matches never overlap.
const TOKENS =
  /(\/\/[^\n]*|#[^\n]*)|("(?:[^"\\\n]|\\.)*")|(\b\d+(?:\.\d+)?\b)|(\b(?:var|new|async|await|public|private|sealed|class|record|struct|void|return|using|namespace|foreach|for|while|throw|null|true|false|if|else|string|int|long|double|bool|Uri|Task|IAsyncEnumerable|yield|this|from|where|select)\b)/g

function highlight(code: string): string {
  return escapeHtml(code).replace(
    TOKENS,
    (match, comment, str, num, keyword) => {
      if (comment) return `<span class="text-[#8A97A0] italic">${comment}</span>`
      if (str) return `<span class="text-[#A7C4A0]">${str}</span>`
      if (num) return `<span class="text-[#E0B080]">${num}</span>`
      if (keyword) return `<span class="text-[#9DB8D8]">${keyword}</span>`
      return match
    },
  )
}

export function CodeBlock({
  language,
  code,
}: {
  language?: string
  code: string
}) {
  const [copied, setCopied] = useState(false)
  const label = language ? (LABELS[language] ?? language.toUpperCase()) : "Kod"

  return (
    <div className="my-5 overflow-hidden rounded-md border border-[#1B252B] bg-[#1B252B]">
      <div className="flex items-center justify-between border-b border-[#F4F2EC]/15 px-3 py-1.5">
        <span className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.14em] text-[#C9D0CE]">
          {label}
        </span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(code).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            })
          }}
          className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.12em] text-[#C9D0CE] transition-colors hover:text-[#F4F2EC]"
        >
          {copied ? "Kopierad" : "Kopiera"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-[13px] leading-6 text-[#F4F2EC]">
        <code
          className="font-[family-name:var(--font-geist-mono)]"
          dangerouslySetInnerHTML={{ __html: highlight(code) }}
        />
      </pre>
    </div>
  )
}
