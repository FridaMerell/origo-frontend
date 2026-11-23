import type { ReactNode } from "react"
import type { TempusSpeciesExtended } from "@/app/lib/dal"
import ExpandableText from "./expandable-text"
import SoundPlayer from "./sound-player"

const REDLIST_NAMES: Record<string, string> = {
  LC: "Livskraftig",
  NT: "Nära hotad",
  VU: "Sårbar",
  EN: "Starkt hotad",
  CR: "Akut hotad",
  RE: "Nationellt utdöd",
  DD: "Kunskapsbrist",
}

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
}

const stripHtml = (value: string) =>
  value
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? entity)
    .replace(/\n{3,}/g, "\n\n")
    .trim()

// Artfakta delivers each text block as text, HTML and a changed date; the
// plain text is preferred and HTML is stripped, never injected.
const textOf = (value: unknown): string => {
  if (typeof value === "string") return stripHtml(value)
  if (Array.isArray(value)) return value.map(textOf).filter(Boolean).join("\n\n")
  if (value && typeof value === "object") {
    const block = value as Record<string, unknown>
    for (const key of ["text", "html", "value", "content", "description"]) {
      const found = textOf(block[key])
      if (found) return found
    }
  }
  return ""
}

// The opening up to a sentence end stays visible; the rest opens on demand.
const HEAD_LIMIT = 500
const splitText = (text: string): [string, string] => {
  if (text.length <= HEAD_LIMIT + 150) return [text, ""]
  const sentenceEnd = text.lastIndexOf(". ", HEAD_LIMIT)
  if (sentenceEnd >= 150) return [text.slice(0, sentenceEnd + 1), text.slice(sentenceEnd + 2)]
  const wordEnd = text.indexOf(" ", HEAD_LIMIT)
  const cut = wordEnd >= 0 ? wordEnd : HEAD_LIMIT
  return [text.slice(0, cut), text.slice(cut).trimStart()]
}

const splitFirstSentence = (text: string): [string, string] => {
  const cut = text.indexOf(". ")
  return cut >= 0 ? [text.slice(0, cut + 1), text.slice(cut + 2)] : [text, ""]
}

const asRecord =(value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null

const Head = ({ title, source }: { title: string; source: string }) => (
  <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-border pb-2">
    <h2 className="text-base font-medium">{title}</h2>
    <span className="text-[10px] italic text-text-muted">{source}</span>
  </div>
)

const Message = ({ text }: { text: string }) => <p className="text-sm italic text-text-muted">{text}</p>

export function SoundsSection({ extended, name, artfakta }: { extended: TempusSpeciesExtended | null; name: string; artfakta: ReactNode }) {
  const recordings = extended?.sounds?.recordings ?? []
  return (
    <section className="flex flex-col gap-3">
      <Head title="Bioakustik" source="Xeno-canto" />
      {!extended ? (
        <><Message text="Servern svarade inte." />{artfakta}</>
      ) : extended.sounds_error ? (
        <><Message text={extended.sounds_error} />{artfakta}</>
      ) : recordings.length === 0 ? (
        <><Message text={`Inga inspelningar av ${name}.`} />{artfakta}</>
      ) : (
        <SoundPlayer recordings={recordings} totalCount={extended.sounds?.count ?? recordings.length} artfakta={artfakta} />
      )}
    </section>
  )
}

type RedlistPost = { period?: { name?: string; current?: boolean }; category?: string; criterion_text?: string }

export function ArtfaktaSection({ extended, name }: { extended: TempusSpeciesExtended | null; name: string }) {
  const data = asRecord(extended?.artfakta)
  const facts = asRecord(data?.species_fact_text) ?? data
  const text = (key: string) => textOf(facts?.[key])
  const posts = Array.isArray(data?.redlist_info) ? (data.redlist_info as RedlistPost[]) : []
  const redlist = posts.find((post) => post.period?.current) ?? posts[0]

  const columns = [
    [
      ["Artbeskrivning och kännetecken", text("characteristic")],
      ["Utbredning och status", text("spread_and_status")],
    ],
    [
      ["Ekologi", text("ecology")],
      ["Hot", text("threat")],
      ["Åtgärder", text("conservation_measures")],
      ["Övrigt", text("other")],
    ],
  ].map((blocks) => blocks.filter(([, body]) => body))

  return (
    <section className="flex flex-col gap-3">
      <Head title="Artfakta" source="SLU Artdatabanken" />
      {!extended ? (
        <Message text="Servern svarade inte." />
      ) : extended.artfakta_error ? (
        <Message text={extended.artfakta_error} />
      ) : !redlist && columns.every((blocks) => blocks.length === 0) ? (
        <Message text={`Inga texter om ${name}.`} />
      ) : (
        <div className="border-t border-border">
          {redlist?.category ? (
            <div className="grid sm:grid-cols-[10rem_minmax(0,1fr)]">
              <p className="border-b border-border px-3 py-2 text-xs italic text-text-muted">
                {redlist.period?.name}
              </p>
              <div className="min-w-0 border-b border-border px-3 py-2">
                <p className="text-sm font-medium">
                  {redlist.category} <span className="text-xs font-normal italic">{REDLIST_NAMES[redlist.category] ?? ""}</span>
                </p>
                {redlist.criterion_text ? (
                  <div className="mt-2 text-sm leading-6 text-text-muted">
                    {(() => {
                      const [head, rest] = splitFirstSentence(stripHtml(redlist.criterion_text ?? ""))
                      return <ExpandableText head={head} rest={rest} />
                    })()}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          {columns.flat().map(([label, body]) => (
            <div key={label} className="grid sm:grid-cols-[10rem_minmax(0,1fr)]">
              <h3 className="border-b border-border px-3 py-2 text-xs italic text-text-muted">{label}</h3>
              <div className="min-w-0 border-b border-border px-3 py-2 text-sm leading-6">
                {(() => {
                  const [head, rest] = splitText(body)
                  return <ExpandableText head={head} rest={rest} />
                })()}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
