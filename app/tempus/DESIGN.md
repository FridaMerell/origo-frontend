# Tempus – designriktlinjer

Härledda ur hur **observationer** och **checklistor** faktiskt är byggda idag
(`observation-form.tsx`, `observationer/[id]/page.tsx`, `checklistor/[id]/page.tsx`,
`checklist-builder.tsx`, `quick-observation.tsx`, `home-view.tsx`, `nav.tsx`).
Målet är att beskriva mönstren som redan finns, städa bort glappen mellan dem och
ge en regel för vilket uttryck som gäller var.

Tempus tema-namn: *"the field guide"*. Ljust läge är default. Allt lever under
`[data-theme="tempus"]` med valfritt `[data-mode="light|dark"]`.

---

## 1. Två ytor, ett system

Tempus växlar idag mellan två visuella språk. Båda ska finnas kvar – men bindas
till rätt syfte istället för att blandas godtyckligt.

### A. Dokumentytan – "förteckningen"

Används när skärmen **representerar ett fysiskt fältdokument**: en ifylld
observationspost, en checklista som ett fältblad. Läsning och lätt redigering på
plats.

Kännetecken (från observations- och checklistdetaljerna):

- Yttre `article`: `overflow-hidden rounded-card border border-border bg-surface text-text shadow-card`.
  `--shadow-card: none` i Tempus → detta är ett **plant, inramat blad**, inte ett svävande kort.
- **Sidhuvud** överst i bladet:
  `flex items-center justify-between border-b border-border pb-1.5 font-display text-[9px] italic text-text-faint`
  - vänster = dokumenttyp: `Observationsförteckning`, `Fältförteckning`
  - höger = löpnummer/upplaga: `Ny införsel`, `Post AB12CD`, `Blad 003` (`String(n).padStart(3, "0")`)
- **Titelblock**: centrerat, `font-display text-2xl italic tracking-wide font-medium` (`sm:text-3xl`).
  Underrubrik `font-display text-xs italic text-text-muted`.
- **Högerspalt 15rem**: `BiotopeMap` på `opacity-45`, gradientslöja
  `bg-linear-to-t from-surface/75`, bildtext `font-display text-[9px] italic text-text-muted`
  – `Biotopskiss · {scientific_name}`.
- **Linjerat rutnät** för data: ytterram `border-l border-t border-border`, varje cell
  `border-b border-r border-border`. Etiketter (`dt`): `text-[9px] italic text-text-faint`.
  Värden: `text-xs italic`. Siffror: `tabular-nums`.
- **Fält inuti rutnätet** är kantlösa: `bg-transparent`, ingen ring, `focus:bg-surface-2`
  (eller `focus:outline-none` + `focus:border-accent` när fältet står i en egen cellruta,
  jfr `datetime-local` i observationsformuläret).
- **Tomt tillstånd** = spökrader i samma rutnät (`border-b border-border`, tomma celler).
- **Fotnot**: `text-right font-display text-[9px] italic text-text-faint`
  ("Markeringarna är tillfälliga och sparas inte.").

### B. Konsolytan – "arbetsbänken"

Används för att **bygga, bläddra, navigera och överblicka**: checklistbyggaren,
listsidor, startsidan, ruttplaneraren, snabbregistrering.

Kännetecken (från `checklist-builder.tsx`, listsidorna, `home-view.tsx`):

- `Card`: `rounded-card border border-border bg-surface p-4.5 shadow-card` – även här
  platt pga `--shadow-card: none`; kort = inramad panel. Explicit `shadow-sm` / `shadow-md`
  bara på det som faktiskt svävar (sticky-sammanfattning, dropdowns, modal).
- **Ögonbryn** (den återkommande signaturen):
  `font-mono text-[10px] uppercase tracking-[.16em]`. Ikon (14 px) är valfri och
  används sparsamt – se §3 *Ikoner*. Standardögonbrynet är rent text.
- **Sid-H1**: `font-display text-3xl font-semibold tracking-tight` (`sm:text-4xl`) – **upprätt, ej kursiv**.
- **Sektions-H2**: `font-display text-xl font-semibold`.
- **Numrerade steg**: `flex size-7 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-contrast`.
- **Kortets huvudband**: `flex items-center gap-3 border-b border-border px-5 py-4`.
- **Standardfält**: `rounded border border-field-border bg-surface px-3 py-2.5 focus:border-accent focus:outline-none`.
  Etikett: `flex flex-col gap-1.5 text-sm font-medium`, valfritt-märkning
  `<span className="font-normal text-text-faint">(valfritt)</span>`.
- **Sökfält**: relativ wrapper, `Icon name="search"` absolut `left-3`, input `pl-9`.
- **Släppzon**: `border border-dashed`; hover `border-accent`; drag `border-accent bg-accent-wash text-accent`.
- **Sticky sammanfattning**: `lg:sticky lg:top-24`, nyckeltal `font-display text-4xl font-semibold text-accent`.
- **Listrad / artkort**: hover `hover:bg-accent-wash`; framhävt kort `border-l-4 border-l-accent`
  (accent för egna/följda, `border-l-secondary` för nationell data).
- **Fenogramremsa**: 12-kolumners grid, månadsinitialer, `font-mono text-[8px] text-text-faint`,
  aktiv månad `bg-accent border-accent`, innevarande månad `outline-2 outline-offset-2 outline-text`.

### Vilket språk gäller?

| Skärm | Yta |
|---|---|
| Observationsdetalj, checklistdetalj (blad) | Dokument |
| Ny observation (fältprotokollet) | Dokument |
| Checklistbyggaren, listsidor, startsida, rutt, taxa | Konsol |
| Snabbregistrering (modal) | Konsol, men bekräftelsen får folioton |
| Navigering, sidfot, sidhuvud med ögonbryn | Konsol |

Regel: **skapar/redigerar man en post som "är" ett fältdokument → dokumentytan.
Allt annat → konsolytan.** Blanda inte italik-serif-rubriker och ögonbryn i samma huvud.

---

## 2. Designtokens (använd variablerna, aldrig råa hex)

### Färg (`app/styles/tokens/colors.css`)

| Token | Ljus | Mörk | Bruk |
|---|---|---|---|
| `--bg` | `#F3EDDF` | `#171512` | sidbakgrund |
| `--surface` | `#FBF8F0` | `#302C25` | blad, kort, fält |
| `--surface-2` | `#E9E2D5` | `#3A352D` | infälld/aktiv yta, chips, fokus i dokumentfält |
| `--border` | `#CFC2AE` | `#5A5145` | alla linjer i rutnät och kort |
| `--border-strong` | `#A4410D` | `#D8733C` | hover-kant, betonad ram |
| `--field-border` | `#B8AA94` | `#746858` | konsolfältens vilokant |
| `--text` / `--text-muted` / `--text-faint` | `#271B13` / `#7E6D5D` / `#93816F` | – | brödtext / sekundärt / etiketter |
| `--accent` | `#A4410D` | `#D8733C` | bränd sienna – primär åtgärd, aktivt, ögonbryn |
| `--accent-wash` | `#F2DED0` | `#3C2A20` | hover-bakgrund, framgångsnotis |
| `--secondary` | `#596B54` | `#96AA8D` | salvie-grön – nationell/kontextuell data |
| `--warning` | `#B06C15` | `#DCA45A` | "snart ur säsong" |
| `--danger` / `--danger-wash` | `#A63425` / `#F2DCD6` | – | fel, borttagning |
| `--success` | `#4F7658` | `#87B28F` | matchad import, klart |
| `--topography-line` | `rgba(164,65,13,.09)` | `rgba(216,115,60,.16)` | subtil höjdkurvetextur |
| `--focus-ring` | `#A4410D` | `#D8733C` | `focus-visible`-outline |

Ögonbrynsfärg **betyder** något: `text-accent` = din egen/primära data ·
`text-secondary` = nationell/härledd data · `text-warning` = avtagande/utfasning ·
`text-text-faint` = neutral metadata.

### Typografi (`app/styles/tokens/typography.css`)

- `--font-display`: **Petrona** (serif) – rubriker, alla etiketter i dokumentytan, bildtexter.
- `--font-body`: **Karla** (sans) – brödtext, formulärvärden, knappar.
- `--font-mono`: **IBM Plex Mono** – ögonbryn, vetenskapliga namn i konsolytan, taxon-ID,
  nyckeltalsrader, paginering, mobiletiketter.
- Skala: `--text-xs .75` → `--text-3xl 2.75rem`. Rubriker `tracking-tight (-.015em)`,
  versal-ögonbryn `tracking-wide (.06em)` / literalt `tracking-[.16em]`.
- Kursiv Petrona hör till **dokumentytan**. Upprätt Petrona `font-semibold` hör till **konsolytan**.

### Form, djup, rörelse (`app/styles/tokens/effects.css` + colors)

- `--radius: 6px`, `--radius-card: 8px`. Tailwind: `rounded` = fält/knappar,
  `rounded-card` = blad/kort, `rounded-full` = stegmarkörer och ikonpuckar.
- `--shadow-card: none` → **Tempus är platt, bläck-på-papper.** Hierarki byggs med
  linjer och yta, inte skuggor. `shadow-sm/md/lg` endast på element som lyfter över sidan.
- Rörelse: `--duration-fast 120ms`, `--duration-normal 180ms`, `--ease-standard cubic-bezier(.4,0,.2,1)`.
  Modal: fade på slöjan + `translateY(2rem)→0` på panelen. Loader-ikon `animate-spin`. Håll det diskret.
- Spacing: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64. Sidcontainer `container mx-auto`,
  detaljblad `max-w-4xl`, dokument-vertikalt `py-5 sm:py-7`, konsol `py-6 sm:py-10`,
  mobil `max-sm:px-3` (dokument) / `max-sm:px-4` (konsol).

---

## 3. Komponentmönster

### Ikoner – sparsamt

Tempus är bläck-på-papper: **text, linjer och yta bär hierarkin, inte ikonografi.**
Utgå från att en vy inte har några ikoner alls. Lägg bara till en ikon när den gör
konkret navigations- eller statusarbete som texten inte redan gör:

- **Ja:** `chevron-right` som avslutar en klickbar listrad · `search` i sökfältets
  wrapper · `plus` på den primära "Ny …"-knappen · `loader animate-spin` under
  transition · en enskild statusprick/ikon (`check`, `x`) i en notis.
- **Nej:** ikon bredvid varje ögonbryn · ikon i H1/H2 · dekorikoner i kort-huvuden ·
  ikon + text som säger samma sak · ikonpuckar som enda innehåll i ett tomt tillstånd
  (en `font-display`-rubrik gör jobbet).

Tumregel: om ikonen kan tas bort utan att något blir svårare att förstå – ta bort den.
Ögonbryn, rubriker och sektionshuvuden är text.

### Knappar
- Primär: `Button` (`bg-accent text-accent-contrast`, `rounded`, `font-semibold`) +
  ledande `Icon` 16 px. Under transition: byt ikon till `loader` + `animate-spin`,
  byt text ("Spara" → "Sparar…", "Skapa checklista" → "Skapar…").
- Länk-som-knapp (listsidornas "Ny …"): `inline-flex items-center gap-2 rounded bg-accent px-4 py-2.5 text-sm font-semibold text-accent-contrast no-underline hover:bg-accent-hover` + `plus`-ikon.
- Sekundär/avfärda: naken text `text-sm text-text-muted hover:text-text` ("Rensa", "Klar").
- Disabled: `disabled:opacity-50 disabled:cursor-not-allowed`.

### Fält
- Konsol: se §1B. Alltid `focus:border-accent focus:outline-none`, placeholder `text-text-faint`.
- Dokument: kantlöst i rutnätscell, `focus:bg-surface-2`. `aria-label` obligatorisk
  eftersom den synliga etiketten sitter i kolumnhuvudet.
- Kryssruta: `accent-[var(--accent)]` (konsol) / `accent-current` (dokument, ärver bläckfärg).

### Art-typeahead (samma i alla tre formulär – håll den identisk)
- Debounce via `useDeferredValue`, träffar vid `query.trim().length >= 2`.
- Panel: `absolute … z-10 mt-1 overflow-hidden rounded border border-border bg-surface shadow-md`.
- Rad: svenskt namn + `ml-2 font-mono text-[11px] text-text-muted` vetenskapligt namn,
  hover `hover:bg-accent-wash hover:text-accent`.
- Statusrader: "Hämtar arter…", "Inga arter matchar." i `text-xs text-text-muted`.
- Paginering i foten: "Föregående · `{page} / {totalPages}` · Nästa", disabled `text-text-faint`.
- Redan valda arter filtreras bort ur träfflistan.

### Notiser (inline, inte toast)
- Fel: `rounded bg-danger-wash px-3 py-2 text-sm text-danger` + `role="alert"`.
- Klart/sparat: `rounded bg-accent-wash px-3 py-2 text-sm text-accent` + `role="status"` + `check`-ikon.
- Importresultat: `border border-border bg-surface`, `file-check`-ikon i `text-success`,
  ej matchade i `<details>`.

### Kort och listor (konsol)
- Listsida = `header` (`flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5`)
  med ögonbryn + H1 + primär länkknapp, sedan antingen `Card`-tomtillstånd eller innehåll.
  Tomtillstånd är i regel bara `font-display`-rubrik + hjälptext + textlänk; ikonpuck
  (`size-12 rounded-full bg-surface-2 text-accent`) är undantag, inte standard.
- Radlista: `Card` med `p-0`, `<ul>`, rader `border-b border-border last:border-b-0`,
  `hover:bg-accent-wash`, avslutande `chevron-right` i `text-text-faint`.
- Metadata på rad: `font-mono text-[11px] text-text-muted`; räkneord som pill
  `rounded bg-surface-2 px-2 py-0.5 font-mono text-xs`.

### Biotopskiss (`BiotopeMap`)
- Alltid härledd ur arten (`biotopePropsFromSpecies`) eller ett `seed` (checklistnamn / "Ny observation").
- Detaljstandard i blad: `detail={7} relief={6} waterStrength={4} featureAmount={3} compass`.
- Som dekor bakom kort: `opacity-30`, `pointer-events-none`, `aria-hidden`, gradient
  `from-surface via-surface/85 to-surface/10` så texten bär.

---

## 4. Att städa (glappen mellan observationer och checklistor idag)

1. **Observationslistan är konsol, observationsdetaljen är dokument** – hårt hopp.
   Låt listraderna antyda liggaren: `tabular-nums`, ev. `Post`-nummer, `font-display`
   på artnamnet. Samma för checklistlistan → checklistbladet.
2. **Två rubrikbehandlingar** – bind italik-serif till dokumentytan och
   upprätt `font-semibold` till konsolytan. Aldrig båda i samma vy.
3. **Fältstil skiljer** (`field-border` + accent-ring vs kantlöst + `surface-2`).
   Behåll skillnaden men bara längs A/B-gränsen – inte inom samma formulär.
4. **Snabbregistrering** använder konsolmodal men skapar en dokumentpost.
   OK för snabbflödet; låt bara bekräftelsen låna folioton
   ("Post införd" snarare än enbart "{art} sparad").
5. **`shadow-card` är no-op i Tempus.** Sluta luta dig på `Card`-skuggan för hierarki;
   använd `border` / `border-strong` / `surface-2`. Dokumentera kort som plana paneler.
6. **Ögonbrynsfärgerna** växlar accent/secondary/warning utan uttalad regel – följ
   betydelsetabellen i §2.

---

## 5. Röst

Svensk mening­sform, gemener (ej Title Case), sakligt fältdagbokstonfall.
Dokumentytan får arkaisk registerjargong ("förteckning", "införsel", "blad",
"särskild anmärkning", "avpr."). Konsolytan är rak och instruerande
("Det går att ändra allt senare.", "Sök namn eller Dyntaxa-ID").
Fel talar om vad man gör härnäst, inte vad som gick fel.
