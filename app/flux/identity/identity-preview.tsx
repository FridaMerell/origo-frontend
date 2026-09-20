"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import {
  colorValue,
  contrastReport,
  isHex,
  pickAsset,
  supportedModes,
  type PreviewIdentity,
  type PreviewMode,
} from "./identity-utils"
import { loadInlineImage } from "./inline-image"
import { buildPreviewDocument } from "./preview-document"

const MODE_LABELS: Record<PreviewMode, string> = { light: "Ljust", dark: "Mörkt" }

const subscribeNothing = () => () => {}
const readOrigin = () => window.location.origin
const serverOrigin = () => ""

/** The mode an identity opens in: its default when it supports both, otherwise its only mode. */
export function initialPreviewMode(identity: Pick<PreviewIdentity, "theme_modes" | "default_mode">): PreviewMode {
  if (identity.theme_modes !== "both") return identity.theme_modes
  return identity.default_mode === "dark" ? "dark" : "light"
}

export function IdentityPreview({
  identity,
  accessibilityTarget,
  height = "36rem",
  showcase = false,
}: {
  identity: PreviewIdentity
  accessibilityTarget: "AA" | "AAA"
  height?: string
  /** The full visual brand board is shown on the identity page, not in the editor. */
  showcase?: boolean
}) {
  const modes = supportedModes(identity.theme_modes)
  const [chosen, setChosen] = useState<PreviewMode>(() => initialPreviewMode(identity))
  // The identity can change under us (e.g. theme_modes edited): fall back to a mode it supports.
  const mode = modes.includes(chosen) ? chosen : modes[0]

  const origin = useSyncExternalStore(subscribeNothing, readOrigin, serverOrigin)
  // The frame is sandboxed and has no session, so the logo is fetched here and handed over as data.
  const logoUrl = pickAsset(identity.assets, ["logo", "logo_mark"], mode)?.url ?? null
  const [inlineImages, setInlineImages] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!logoUrl || logoUrl in inlineImages) return
    let active = true
    void loadInlineImage(logoUrl).then((data) => {
      if (active && data) setInlineImages((current) => ({ ...current, [logoUrl]: data }))
    })
    return () => {
      active = false
    }
  }, [logoUrl, inlineImages])

  // Plain computation: an unchanged srcDoc string does not reload the frame.
  const document = origin ? buildPreviewDocument(identity, mode, origin, inlineImages, showcase) : ""
  const report = contrastReport(identity.colors, accessibilityTarget, identity.theme_modes).filter((row) => row.mode === mode)

  return (
    <div className="flex flex-col gap-4">
      {modes.length > 1 && (
        <div role="group" aria-label="Förhandsgranska läge" className="flex gap-1 self-start rounded-md border border-border bg-surface p-1">
          {modes.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={item === mode}
              onClick={() => setChosen(item)}
              className={`rounded px-3 py-1 text-sm transition-colors ${item === mode ? "bg-surface-2 font-medium text-text" : "text-text-muted hover:bg-surface-2/60"}`}
            >
              {MODE_LABELS[item]}
            </button>
          ))}
        </div>
      )}

      {/* Sandboxed and script-free: fonts load and styles apply without touching the app's own theme. */}
      <iframe
        title="Förhandsvisning av identitet"
        sandbox=""
        srcDoc={document}
        style={{ height }}
        className="w-full rounded-lg border border-border bg-white"
      />

      {identity.colors.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label={`Färger, ${MODE_LABELS[mode].toLowerCase()} läge`}>
          {identity.colors.map((color, index) => {
            const value = colorValue(color, mode)
            return (
              <div key={`${color.name}-${index}`} className="flex w-24 flex-col gap-1 text-xs">
                <span
                  className="h-10 rounded-md border border-border"
                  style={{ backgroundColor: isHex(value) ? value : "transparent" }}
                />
                <span className="truncate font-medium text-text" title={color.name}>{color.name || "–"}</span>
                <span className="font-mono text-text-faint">{isHex(value) ? value : "saknas"}</span>
                {color.role && <span className="text-text-muted">{color.role}</span>}
              </div>
            )
          })}
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-text-faint">
          Kontrast, {MODE_LABELS[mode].toLowerCase()} läge (WCAG {accessibilityTarget})
        </h4>
        {report.length === 0 ? (
          <p className="text-sm text-text-muted">
            Ge färgerna roller (text, background, surface, primary med flera) så räknas kontrasten ut här.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-faint">
                  <th className="px-3 py-2 font-semibold">Par</th>
                  <th className="px-3 py-2 font-semibold">Kvot</th>
                  <th className="px-3 py-2 font-semibold">Krav</th>
                  <th className="px-3 py-2 font-semibold">Resultat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.map((row) => (
                  <tr key={`${row.foreground}-${row.background}`}>
                    <td className="px-3 py-2 text-text">{row.foreground} på {row.background}</td>
                    <td className="px-3 py-2 font-mono text-text-muted">{row.ratio}:1</td>
                    <td className="px-3 py-2 font-mono text-text-muted">{row.required}:1</td>
                    <td className={`px-3 py-2 font-medium ${row.passed ? "text-text" : "text-danger"}`}>
                      {row.passed ? "Godkänd" : "Underkänd"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
