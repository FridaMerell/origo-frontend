import {
  TOKEN_NAME_PATTERN,
  colorValue,
  escapeHtml,
  isHex,
  parseRatio,
  pickAsset,
  previewVariables,
  safeImportUrl,
  typeScale,
  type PreviewIdentity,
  type PreviewMode,
} from "./identity-utils"

function resolveUrl(url: string, origin: string): string | null {
  try {
    const resolved = new URL(url, origin)
    return resolved.protocol === "https:" || resolved.origin === origin ? resolved.href : null
  } catch {
    return null
  }
}

/** First colour with the given role, resolved for the mode; a neutral fallback keeps the sample readable. */
function roleColor(identity: PreviewIdentity, role: string, mode: PreviewMode, fallback: string): string {
  const match = identity.colors.find((color) => color.role === role && isHex(colorValue(color, mode)))
  return match ? colorValue(match, mode) : fallback
}

/**
 * Standalone HTML for the sandboxed preview frame. It is rendered with no scripts and its own CSP,
 * so the identity's fonts load without touching the app's theme, and every identity-supplied value
 * is either escaped or validated (see previewVariables / safeImportUrl) before it reaches the markup.
 */
const DATA_IMAGE = /^data:image\/(png|jpeg|webp|gif|svg\+xml|x-icon|vnd\.microsoft\.icon);base64,[A-Za-z0-9+/=]+$/

export function buildPreviewDocument(
  identity: PreviewIdentity,
  mode: PreviewMode,
  origin: string,
  /** Assets already fetched by the app (uploads live in a private bucket the frame cannot reach), by asset url. */
  inlineImages: Record<string, string> = {},
  showcase = false,
): string {
  const vars = previewVariables(identity, mode)
  const declarations = Object.entries(vars).map(([name, value]) => `${name}:${value};`).join("")

  const dark = mode === "dark"
  const background = roleColor(identity, "background", mode, dark ? "#111111" : "#ffffff")
  const surface = roleColor(identity, "surface", mode, dark ? "#1c1c1c" : "#f5f5f5")
  const text = roleColor(identity, "text", mode, dark ? "#f2f2f2" : "#111111")
  const muted = roleColor(identity, "muted", mode, dark ? "#a0a0a0" : "#5f5f5f")
  const border = roleColor(identity, "border", mode, dark ? "#333333" : "#dddddd")
  const primary = roleColor(identity, "primary", mode, "#3b6cf6")
  const success = roleColor(identity, "success", mode, "#2e8b57")
  const warning = roleColor(identity, "warning", mode, "#c98a00")
  const danger = roleColor(identity, "danger", mode, "#c0392b")
  // Text on the primary colour: whichever of white/black reads better.
  const onPrimary = parseInt(primary.slice(1, 3), 16) * 0.299 + parseInt(primary.slice(3, 5), 16) * 0.587 + parseInt(primary.slice(5, 7), 16) * 0.114 > 150 ? "#000000" : "#ffffff"

  const importUrl = safeImportUrl(identity.font_import_url)
  const resolvedImport = importUrl ? resolveUrl(importUrl, origin) : null
  const logo = pickAsset(identity.assets, ["logo", "logo_mark"], mode)
  const inline = logo ? inlineImages[logo.url] : undefined
  const logoUrl = inline && DATA_IMAGE.test(inline) ? inline : logo ? resolveUrl(logo.url, origin) : null

  const heading = vars["--brand-font-heading"] ?? "system-ui, sans-serif"
  const body = vars["--brand-font-body"] ?? "system-ui, sans-serif"
  const mono = vars["--brand-font-mono"] ?? "ui-monospace, monospace"

  const scale = typeScale(identity.base_font_size, parseRatio(identity.type_scale_ratio))
  const radii = Object.entries(identity.radii).filter(([name, value]) => TOKEN_NAME_PATTERN.test(name) && Number.isInteger(value) && value >= 0 && value <= 999)
  const shadowNames = Object.keys({ ...identity.shadows, ...(dark ? identity.shadows_dark : {}) })
    .filter((name) => TOKEN_NAME_PATTERN.test(name) && `--brand-shadow-${name}` in vars)
  const radiusMd = radii.some(([name]) => name === "md") ? "var(--brand-radius-md)" : "8px"

  const title = escapeHtml(identity.brand_name || identity.name || "Identitet")
  const tagline = escapeHtml(identity.tagline)
  const description = escapeHtml(identity.tagline || "En tydlig digital upplevelse med fokus på innehåll och handling.")

  const css = `
:root{${declarations}color-scheme:${mode};}
*{box-sizing:border-box}
body{margin:0;padding:var(--brand-space-4,16px);background:${background};color:${text};font-family:${body};font-size:var(--brand-text-base,1rem);line-height:1.5}
h1,h2,h3{font-family:${heading};margin:0}
code{font-family:${mono}}
.muted{color:${muted}}
.row{display:flex;gap:var(--brand-space-3,12px);align-items:center;flex-wrap:wrap}
.card{background:${surface};border:1px solid ${border};border-radius:${radiusMd};padding:var(--brand-space-5,20px);display:flex;flex-direction:column;gap:var(--brand-space-3,12px)}
.btn{font:inherit;font-weight:600;border-radius:${radiusMd};padding:var(--brand-space-2,8px) var(--brand-space-4,16px);border:1px solid ${primary};cursor:default}
.btn.primary{background:${primary};color:${onPrimary}}
.btn.ghost{background:transparent;color:${primary}}
.input{font:inherit;color:${text};background:${background};border:1px solid ${border};border-radius:${radiusMd};padding:var(--brand-space-2,8px) var(--brand-space-3,12px);min-width:0;flex:1}
.field{display:flex;flex-direction:column;gap:var(--brand-space-1,4px);flex:1;min-width:0}
.field-label{font-size:var(--brand-text-xs,.75rem);font-weight:600;color:${muted}}
.help{font-size:var(--brand-text-xs,.75rem);color:${muted};margin:0}
.badge{font-size:var(--brand-text-xs,.75rem);font-weight:600;border-radius:999px;padding:2px 10px;border:1px solid currentColor}
.section{margin-top:var(--brand-space-6,24px);display:flex;flex-direction:column;gap:var(--brand-space-2,8px)}
.label{font-size:var(--brand-text-xs,.75rem);text-transform:uppercase;letter-spacing:.06em;color:${muted}}
.swatch{width:72px;height:56px;background:${surface};border:1px solid ${border};display:flex;align-items:flex-end;padding:6px;font-size:11px;color:${text}}
img.logo{max-height:40px;max-width:160px}
.showcase{max-width:960px;margin:0 auto;padding-bottom:var(--brand-space-8,32px)}
.showcase-nav{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 0 22px;border-bottom:1px solid ${border}}
.showcase-nav nav{display:flex;gap:18px;color:${muted};font-size:var(--brand-text-sm,.875rem)}
.hero{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(220px,.6fr);gap:var(--brand-space-6,24px);padding:clamp(28px,7vw,68px) 0}
.hero h1{font-size:clamp(var(--brand-text-3xl,2.4rem),7vw,var(--brand-text-4xl,3.1rem));line-height:1.02;letter-spacing:-.04em}
.hero p{max-width:38rem;margin:0;color:${muted};font-size:var(--brand-text-lg,1.125rem)}
.hero-copy{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:var(--brand-space-4,16px)}
.feature-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--brand-space-4,16px)}
.feature-grid .card{min-height:150px;justify-content:space-between}
.feature-grid .card:first-child{grid-column:span 2;background:${primary};color:${onPrimary};border-color:${primary}}
.feature-grid .card:first-child .muted{color:${onPrimary};opacity:.78}
.feature-label{font-size:var(--brand-text-xs,.75rem);font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${muted}}
.editorial{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(220px,.9fr);gap:var(--brand-space-6,24px);margin-top:var(--brand-space-7,28px);padding-top:var(--brand-space-7,28px);border-top:1px solid ${border}}
.editorial h2{font-size:var(--brand-text-2xl,1.5rem);line-height:1.12}
.editorial p{color:${muted};margin:0}
.quote{border-left:3px solid ${primary};padding-left:var(--brand-space-4,16px);font-family:${heading};font-size:var(--brand-text-xl,1.25rem);line-height:1.35}
@media(max-width:620px){.hero,.editorial{grid-template-columns:1fr}.showcase-nav nav{display:none}.feature-grid{grid-template-columns:1fr}.feature-grid .card:first-child{grid-column:auto}}
`

  const typeRows = scale
    .map(({ name, rem }) => `<div class="row"><span class="label" style="width:3rem">${escapeHtml(name)}</span><span style="font-size:${rem};font-family:${heading};line-height:1.2">Rubrik ${escapeHtml(rem)}</span></div>`)
    .join("")

  const radiusRows = radii
    .map(([name, value]) => `<div class="swatch" style="border-radius:${value}px">${escapeHtml(name)} ${value}px</div>`)
    .join("")

  const shadowRows = shadowNames
    .map((name) => `<div class="swatch" style="box-shadow:var(--brand-shadow-${name});border-color:transparent">${escapeHtml(name)}</div>`)
    .join("")

  const compactBody = `<div class="row" style="justify-content:space-between">
  <div class="row">${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="">` : ""}<div><h2 style="font-size:var(--brand-text-2xl,1.5rem)">${title}</h2>${tagline ? `<div class="muted">${tagline}</div>` : ""}</div></div>
  <span class="badge" style="color:${success}">Aktiv</span>
</div>
<div class="section"><div class="label">Exempelkort</div>
<div class="card" style="box-shadow:${shadowNames.length ? `var(--brand-shadow-${shadowNames[0]})` : "none"}">
  <h3 style="font-size:var(--brand-text-xl,1.25rem)">Rubrik i kortet</h3>
  <p style="margin:0">Brödtext i identitetens teckensnitt. <span class="muted">Dämpad text ser ut så här.</span> <code>kod</code></p>
<div class="row"><input class="input" value="Textfält" readonly><button class="btn primary" type="button">Primär</button><button class="btn ghost" type="button">Sekundär</button></div>
  <div class="row"><span class="badge" style="color:${success}">Klar</span><span class="badge" style="color:${warning}">Varning</span><span class="badge" style="color:${danger}">Fel</span></div>
</div></div>
<div class="section"><div class="label">Formulär</div>
<div class="card">
  <div class="row"><label class="field"><span class="field-label">Namn</span><input class="input" value="Anna Andersson" readonly></label><label class="field"><span class="field-label">Ärende</span><select class="input"><option>Välj kategori</option><option>Support</option></select></label></div>
  <label class="row" style="font-size:var(--brand-text-sm,.875rem)"><input type="checkbox" checked disabled> Jag vill få en uppdatering</label>
  <p class="help">Hjälptext och validering följer samma dämpade ton.</p>
  <div class="row"><button class="btn primary" type="button">Skicka</button><button class="btn ghost" type="button">Avbryt</button></div>
</div></div>
${logoUrl ? `<div class="section"><div class="label">Bilder & media</div><div class="card"><div class="row"><img class="logo" src="${escapeHtml(logoUrl)}" alt=""><span class="muted">Logotyp i sitt sammanhang</span></div></div></div>` : ""}
<div class="section"><div class="label">Typskala</div>${typeRows}</div>
${radii.length ? `<div class="section"><div class="label">Hörn</div><div class="row">${radiusRows}</div></div>` : ""}
${shadowNames.length ? `<div class="section"><div class="label">Skuggor</div><div class="row" style="padding:var(--brand-space-2,8px)">${shadowRows}</div></div>` : ""}`

  const showcaseBody = `<main class="showcase">
<header class="showcase-nav">
  <div class="row">${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="">` : ""}<strong>${title}</strong></div>
  <nav><span>Utforska</span><span>Berättelser</span><span>Om oss</span></nav>
</header>
<section class="hero">
  <div class="hero-copy"><span class="feature-label">${tagline || "En sammanhållen upplevelse"}</span><h1>${title}</h1><p>${description}</p><div class="row"><button class="btn primary" type="button">Utforska nu</button><button class="btn ghost" type="button">Läs mer</button></div></div>
  <div class="feature-grid"><div class="card"><span class="feature-label">Huvudhandling</span><h2 style="font-size:var(--brand-text-xl,1.25rem)">En tydlig väg framåt</h2><span class="muted">Primärfärg, rubrik och hierarki i samspel.</span></div><div class="card"><span class="feature-label">Status</span><span class="badge" style="color:${success}">Publicerad</span></div><div class="card"><span class="feature-label">Innehåll</span><strong style="font-size:var(--brand-text-lg,1.125rem)">Läs vidare</strong></div></div>
</section>
<section class="editorial"><article class="card" style="box-shadow:${shadowNames.length ? `var(--brand-shadow-${shadowNames[0]})` : "none"}"><span class="feature-label">Utvalt innehåll</span><h2>En rubrik som ger innehållet tyngd</h2><p>Brödtexten visar hur färg, rytm och typografi fungerar tillsammans när människor faktiskt läser och fattar beslut.</p><div class="row"><span class="badge" style="color:${success}">Klar</span><span class="badge" style="color:${warning}">Pågår</span><span class="badge" style="color:${danger}">Viktigt</span></div></article><aside class="card"><span class="feature-label">Formulär</span><input class="input" value="Din e-postadress" readonly><button class="btn primary" type="button">Fortsätt</button><span class="muted">Fält, gränser och knapp i ett vardagligt flöde.</span></aside></section>
<section class="editorial"><div><span class="feature-label">Röst</span><p class="quote">Identiteten ska kännas lika tydlig i en kort statusrad som i en längre berättelse.</p></div><div class="card"><span class="feature-label">Sekundär handling</span><h3 style="font-size:var(--brand-text-lg,1.125rem)">Något att återvända till</h3><p>En lugn yta med dämpad information och tydlig nästa handling.</p><button class="btn ghost" type="button">Se alla</button></div></section>
</main>`

  const doc = `<!doctype html>
<html lang="sv"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https: ${origin}; font-src https: data: ${origin}; img-src https: data: ${origin}">
${resolvedImport ? `<link rel="stylesheet" href="${escapeHtml(resolvedImport)}">` : ""}
<style>${css}</style></head><body>
${showcase ? showcaseBody : compactBody}
</body></html>`
  return doc
}
