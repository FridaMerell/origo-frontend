import { useRef, useState } from "react"
import { matchSpeciesValues } from "@/app/tempus/_actions/species"

const MAX_CSV_BYTES = 2 * 1024 * 1024

const NAME_HEADERS = new Set([
  "art",
  "artnamn",
  "name",
  "species",
  "svenskt_namn",
  "swedish_name",
  "vetenskapligt_namn",
  "scientific_name",
])
const ID_HEADERS = new Set(["taxon_id", "dyntaxa_id", "dyntaxa_taxon_id"])

type ImportResult = {
  fileName: string
  matched: number
  unmatched: string[]
}

export type FormMessageCallbacks = {
  onError: (message: string) => void
  onClearMessages: () => void
}

function normalize(value: string) {
  return value
    .replace(/^﻿/, "")
    .trim()
    .toLocaleLowerCase("sv")
    .replace(/[\s-]+/g, "_")
}

function cellsIn(line: string, delimiter: string) {
  const cells: string[] = []
  let cell = ""
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"' && quoted && line[index + 1] === '"') {
      cell += '"'
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === delimiter && !quoted) {
      cells.push(cell.trim())
      cell = ""
    } else {
      cell += character
    }
  }

  cells.push(cell.trim())
  return cells
}

function detectDelimiter(line: string) {
  const candidates = [";", ",", "\t"]
  return candidates.reduce((best, candidate) =>
    cellsIn(line, candidate).length > cellsIn(line, best).length ? candidate : best,
  )
}

export function CsvImport({
  onMatched,
  messages: { onError, onClearMessages },
}: {
  onMatched: (matchedIds: string[]) => void
  messages: FormMessageCallbacks
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const importCsv = async (file: File) => {
    onClearMessages()
    setImportResult(null)

    if (!file.name.toLocaleLowerCase().endsWith(".csv")) {
      onError("Välj en CSV-fil.")
      return
    }
    if (file.size > MAX_CSV_BYTES) {
      onError("CSV-filen får vara högst 2 MB.")
      return
    }

    setImporting(true)
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter((line) => line.trim())
      if (lines.length === 0) throw new Error("CSV-filen är tom.")

      const delimiter = detectDelimiter(lines[0])
      const firstRow = cellsIn(lines[0], delimiter)
      const normalizedHeaders = firstRow.map(normalize)
      const hasHeaders = normalizedHeaders.some(
        (header) => NAME_HEADERS.has(header) || ID_HEADERS.has(header),
      )
      const headers = hasHeaders ? normalizedHeaders : ["art"]
      const rows = hasHeaders ? lines.slice(1) : lines
      const candidateIndexes = headers.flatMap((header, index) =>
        NAME_HEADERS.has(header) || ID_HEADERS.has(header) ? [index] : [],
      )
      const indexes = candidateIndexes.length > 0 ? candidateIndexes : [0]

      const values = rows.flatMap((row) => {
        const cells = cellsIn(row, delimiter)
        return indexes.map((index) => cells[index]?.trim()).filter(Boolean)
      })
      const { matchedIds, unmatched } = await matchSpeciesValues(values)

      onMatched(matchedIds)
      setImportResult({ fileName: file.name, matched: matchedIds.length, unmatched })
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "CSV-filen kunde inte läsas.")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="border-b border-border px-4 py-4 sm:px-5">
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click()
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          const file = event.dataTransfer.files[0]
          if (file) void importCsv(file)
        }}
        className={`flex cursor-pointer items-center justify-between gap-4 rounded-none border border-dashed px-4 py-4 text-left transition-colors ${
          dragOver
            ? "border-accent bg-accent-wash text-accent"
            : "border-border bg-surface-2 text-text-muted hover:border-accent hover:text-text"
        }`}
      >
        <div>
          <p className="text-sm font-semibold text-text">
            {importing ? "Läser artlistan…" : "Släpp en CSV här eller välj fil"}
          </p>
          <p className="mt-1 text-xs">Svenskt namn, vetenskapligt namn eller Dyntaxa-ID · max 2 MB</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void importCsv(file)
            event.target.value = ""
          }}
        />
      </div>

      {importResult ? (
        <div className="mt-3 border-y border-border py-3 text-sm" aria-live="polite">
          <div className="min-w-0">
            <p className="font-medium"><span className="break-all">{importResult.fileName}</span> · {importResult.matched} matchade</p>
            {importResult.unmatched.length > 0 ? (
              <details className="mt-1 text-text-muted">
                <summary className="cursor-pointer">{importResult.unmatched.length} kunde inte matchas</summary>
                <p className="mt-1 break-words text-xs">{importResult.unmatched.slice(0, 12).join(", ")}{importResult.unmatched.length > 12 ? " …" : ""}</p>
              </details>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
