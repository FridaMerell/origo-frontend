"use client"

import { useEffect, useState } from "react"
import { ArrowRightIcon } from "lucide-react"
import type { FluxIdentity } from "@/app/lib/dal"
import { fileProxyUrl } from "@/app/lib/files"
import { FONT_NAME_PATTERN, colorValue, isHex, luminance, pickAsset, safeImportUrl, supportedModes, type PreviewMode } from "./identity-utils"

const MODE_LABELS: Record<PreviewMode, string> = { light: "Ljust", dark: "Mörkt" }

function assetSrc(url: string): string {
  return url.startsWith("/") ? url : fileProxyUrl(url)
}

function initialMode(identity: FluxIdentity): PreviewMode {
  if (identity.theme_modes !== "both") return identity.theme_modes
  return identity.default_mode === "dark" ? "dark" : "light"
}

/** A full-page, practical brand introduction for the saved identity — never used in the editor. */
export function IdentityBrandIntro({ identity }: { identity: FluxIdentity }) {
  const modes = supportedModes(identity.theme_modes)
  const [chosen, setChosen] = useState<PreviewMode>(() => initialMode(identity))
  const mode = modes.includes(chosen) ? chosen : modes[0]
  const role = (name: string, fallback: string) => {
    const color = identity.colors.find((item) => item.role === name)
    const value = color ? colorValue(color, mode) : fallback
    return isHex(value) ? value : fallback
  }

  const background = role("background", mode === "dark" ? "#111111" : "#ffffff")
  const surface = role("surface", mode === "dark" ? "#1c1c1c" : "#f5f5f5")
  const text = role("text", mode === "dark" ? "#f2f2f2" : "#111111")
  const muted = role("muted", mode === "dark" ? "#a0a0a0" : "#5f5f5f")
  const border = role("border", mode === "dark" ? "#333333" : "#dddddd")
  const primary = role("primary", "#3b6cf6")
  const accent = role("accent", primary)
  const success = role("success", "#2e8b57")
  const warning = role("warning", "#c98a00")
  const danger = role("danger", "#c0392b")
  const onPrimary = luminance(primary) > 0.45 ? "#111111" : "#ffffff"
  const logo = pickAsset(identity.assets, ["logo", "logo_mark"], mode)
  const media = identity.assets.filter((asset) => ["illustration", "icon", "other"].includes(asset.kind) && asset.url).slice(0, 4)
  const title = identity.brand_name || identity.name
  const description = identity.description || identity.tagline || "Ett tydligt visuellt uttryck för digitala upplevelser."
  const fontUrl = safeImportUrl(identity.font_import_url)
  const headingFont = FONT_NAME_PATTERN.test(identity.heading_font.trim()) ? `"${identity.heading_font.trim()}", Georgia, serif` : "Georgia, serif"
  const bodyFont = FONT_NAME_PATTERN.test(identity.body_font.trim()) ? `"${identity.body_font.trim()}", system-ui, sans-serif` : "system-ui, sans-serif"

  useEffect(() => {
    if (!fontUrl) return
    const existing = document.querySelector(`link[data-flux-identity-font="${CSS.escape(fontUrl)}"]`)
    if (existing) return
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = fontUrl
    link.dataset.fluxIdentityFont = fontUrl
    document.head.appendChild(link)
    return () => link.remove()
  }, [fontUrl])

  return (
    <section className="overflow-hidden rounded-xl border" style={{ backgroundColor: background, borderColor: border, color: text, fontFamily: bodyFont }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 sm:px-7" style={{ borderColor: border }}>
        <div className="flex min-w-0 items-center gap-3">
          {logo && <img src={assetSrc(logo.url)} alt="" className="max-h-7 max-w-28 object-contain" />}
          <span className="truncate text-sm font-semibold" style={{ color: text }}>{title}</span>
        </div>
        {modes.length > 1 && (
          <div role="group" aria-label="Visa identiteten i läge" className="flex rounded-md border p-1" style={{ borderColor: border, backgroundColor: surface }}>
            {modes.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={item === mode}
                onClick={() => setChosen(item)}
                className="rounded px-3 py-1 text-sm transition-colors"
                style={{ backgroundColor: item === mode ? background : "transparent", color: item === mode ? text : muted }}
              >
                {MODE_LABELS[item]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-8 px-5 py-10 sm:px-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,.8fr)] lg:px-10 lg:py-14">
        <div className="flex flex-col items-start justify-center gap-5">
          {logo && <div className="flex h-32 w-72 items-center rounded-lg border p-6" style={{ borderColor: border, backgroundColor: surface }}><img src={assetSrc(logo.url)} alt={`${title} logotyp`} className="max-h-full max-w-full object-contain" /></div>}
          <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: accent }}>{identity.tagline || "Visuell identitet"}</p>
          <h2 className="text-4xl font-semibold leading-none tracking-tight sm:text-5xl" style={{ color: text, fontFamily: headingFont }}>{title}</h2>
          <p className="max-w-2xl text-base leading-7 sm:text-lg" style={{ color: muted }}>{description}</p>
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold" style={{ backgroundColor: primary, color: onPrimary }}>
              Utforska uttrycket <ArrowRightIcon size={15} />
            </span>
            <span className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-semibold" style={{ borderColor: primary, color: primary }}>Läs berättelsen</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <article className="flex min-h-36 flex-col justify-between rounded-lg border p-5 sm:col-span-2 lg:col-span-1" style={{ backgroundColor: primary, borderColor: primary, color: onPrimary }}>
            <span className="text-xs font-semibold uppercase tracking-[0.12em] opacity-75">Huvudhandling</span>
            <strong className="text-2xl leading-tight" style={{ fontFamily: headingFont }}>En tydlig väg framåt</strong>
            <span className="text-sm opacity-80">Färg, hierarki och handling i samma riktning.</span>
          </article>
          <article className="rounded-lg border p-4" style={{ backgroundColor: surface, borderColor: border }}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: muted }}>Status</p>
            <p className="mt-4 text-sm font-semibold" style={{ color: success }}>● Publicerad</p>
          </article>
          <article className="rounded-lg border p-4" style={{ backgroundColor: surface, borderColor: border }}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: muted }}>Accent</p>
            <span className="mt-3 block h-7 rounded-md" style={{ backgroundColor: accent }} />
          </article>
        </div>
      </div>

      <div className="grid gap-4 border-t px-5 py-6 sm:grid-cols-3 sm:px-7 lg:px-10" style={{ borderColor: border, backgroundColor: surface }}>
        <article className="rounded-lg border p-4 sm:col-span-2" style={{ backgroundColor: background, borderColor: border }}>
          <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: muted }}>Innehåll</p>
          <h3 className="mt-3 text-2xl font-semibold leading-tight" style={{ color: text, fontFamily: headingFont }}>En rubrik som gör innehållet angeläget</h3>
          <p className="mt-3 leading-6" style={{ color: muted }}>Brödtext, struktur och ytor visar hur identiteten fungerar när människor läser, väljer och återvänder.</p>
        </article>
        <article className="rounded-lg border p-4" style={{ backgroundColor: background, borderColor: border }}>
          <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: muted }}>Röst</p>
          <p className="mt-3 text-lg leading-7" style={{ color: text, fontFamily: headingFont }}>{identity.tone || "Tydlig, varm och fokuserad på det väsentliga."}</p>
        </article>
      </div>

      <div className="border-t px-5 py-7 sm:px-7 lg:px-10" style={{ borderColor: border }}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: muted }}>I vardagen</p>
            <h3 className="mt-1 text-2xl font-semibold" style={{ color: text, fontFamily: headingFont }}>Fler uttryck för samma identitet</h3>
          </div>
          <p className="max-w-md text-sm" style={{ color: muted }}>Samma färger och rytm fungerar i formulär, listor och återkoppling.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-lg border p-4" style={{ backgroundColor: surface, borderColor: border }}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: muted }}>Formulär</p>
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5"><span className="text-sm font-medium">Namn</span><div role="textbox" aria-label="Namn" className="rounded-md border px-3 py-2 text-sm" style={{ backgroundColor: background, borderColor: border, color: text }}>Anna Andersson</div></div>
              <div className="flex flex-col gap-1.5"><span className="text-sm font-medium">Ärende</span><div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm" style={{ backgroundColor: background, borderColor: border, color: text }}><span>Välj kategori</span><span style={{ color: muted }}>⌄</span></div></div>
              <div className="flex items-center gap-2 text-sm"><span className="flex size-4 items-center justify-center rounded-sm text-[11px] font-bold" style={{ backgroundColor: primary, color: onPrimary }}>✓</span> Jag vill få en uppdatering</div>
              <span className="inline-flex self-start rounded-md px-3 py-2 text-sm font-semibold" style={{ backgroundColor: primary, color: onPrimary }}>Skicka förfrågan</span>
            </div>
          </article>

          <article className="rounded-lg border p-4" style={{ backgroundColor: surface, borderColor: border }}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: muted }}>Lista & data</p>
            <div className="mt-4 divide-y" style={{ borderColor: border }}>
              {["Ny berättelse", "Designsystem", "Lansering"].map((item, index) => (
                <div key={item} className="flex items-center justify-between gap-3 py-3 text-sm" style={{ borderColor: border }}>
                  <span className="font-medium">{item}</span>
                  <span className="rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: index === 1 ? success : border, color: index === 1 ? success : muted }}>{index === 1 ? "Klar" : "Pågår"}</span>
                </div>
              ))}
            </div>
            <span className="mt-2 inline-flex text-sm font-semibold" style={{ color: primary }}>Visa alla →</span>
          </article>

          <article className="rounded-lg border p-4" style={{ backgroundColor: surface, borderColor: border }}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: muted }}>Återkoppling</p>
            <div className="mt-4 flex flex-col gap-2">
              <div className="rounded-md border p-3 text-sm" style={{ borderColor: success, backgroundColor: `${success}12` }}><strong style={{ color: success }}>Sparat</strong><p className="mt-1" style={{ color: muted }}>Dina ändringar är publicerade.</p></div>
              <div className="rounded-md border p-3 text-sm" style={{ borderColor: warning, backgroundColor: `${warning}12` }}><strong style={{ color: warning }}>Obs!</strong><p className="mt-1" style={{ color: muted }}>En färg behöver bättre kontrast.</p></div>
              <div className="rounded-md border p-3 text-sm" style={{ borderColor: danger, backgroundColor: `${danger}12` }}><strong style={{ color: danger }}>Fel</strong><p className="mt-1" style={{ color: muted }}>Något kunde inte sparas.</p></div>
            </div>
          </article>
        </div>
      </div>

      <div className="border-t px-5 py-7 sm:px-7 lg:px-10" style={{ borderColor: border, backgroundColor: surface }}>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: muted }}>Bilder & media</p>
          <h3 className="mt-1 font-display text-2xl font-semibold" style={{ color: text }}>Så bär identiteten visuellt innehåll</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {media.length > 0 ? media.map((asset) => (
            <figure key={asset.url} className="overflow-hidden rounded-lg border" style={{ borderColor: border, backgroundColor: background }}>
              <div className="flex h-36 items-center justify-center p-4" style={{ backgroundColor: asset.mode === "dark" ? "#161616" : surface }}>
                <img src={assetSrc(asset.url)} alt={asset.usage || asset.name} className="max-h-full max-w-full object-contain" />
              </div>
              <figcaption className="p-3"><p className="truncate text-sm font-semibold">{asset.name}</p><p className="mt-1 text-xs" style={{ color: muted }}>{asset.usage || "Visuellt innehåll"}</p></figcaption>
            </figure>
          )) : (
            <div className="flex min-h-36 items-center justify-center rounded-lg border border-dashed p-6 text-center sm:col-span-2 lg:col-span-4" style={{ borderColor: border, backgroundColor: background }}>
              <div><p className="text-sm font-semibold">Ingen media uppladdad ännu</p><p className="mt-1 text-sm" style={{ color: muted }}>Lägg till logotyp, bildmärke eller illustration i identiteten för att se dem här.</p></div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
