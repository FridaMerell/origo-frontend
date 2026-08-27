# Token map

Every custom property a tenant theme defines, what it controls, and which
design-kit input feeds it. Tokens are scoped to `[data-theme="<id>"]` (light)
and the two dark blocks. Shared tokens (`--space-*`, `--radius-sm/md/lg`) live on
bare `:root` in `colors.css` — do not redefine per tenant.

`globals.css` `@theme inline` already exposes each of these as a Tailwind
utility, so defining the var is all that's needed:
`--bg` → `bg-bg`, `--text-muted` → `text-text-muted`, `--font-display` →
`font-display`, `--radius-card` → `rounded-card`, `--shadow-md` → `shadow-md`.

## colors.css

| Token | Role | From the kit |
|---|---|---|
| `--bg` | app background behind everything | page bg |
| `--surface` | cards, panels, inputs | surface / card color |
| `--surface-2` | recessed areas, table stripes, wells | slightly off surface |
| `--surface-raised` | popovers, dropdowns, drawers | usually == surface |
| `--border` | default hairline borders | subtle border |
| `--border-strong` | emphasized dividers, focused fields | stronger border / often accent-ish |
| `--field-border` | form control resting border | mid-contrast neutral |
| `--text` | primary body text | ink |
| `--text-muted` | secondary text, labels | ~60% ink |
| `--text-faint` | timestamps, captions, disabled | ~50% ink (can equal muted) |
| `--accent` | primary buttons, active nav, brand | brand primary |
| `--accent-hover` / `--accent-active` | accent interaction states | brand primary ±luminance |
| `--accent-contrast` | text/icon on top of `--accent` fill | ink or paper that reads on accent |
| `--accent-wash` | tinted hover backgrounds, selected rows | ~10% accent |
| `--secondary` | secondary actions, info accents | brand secondary |
| `--secondary-wash` | secondary tinted backgrounds | ~10% secondary |
| `--danger` / `--danger-wash` | destructive, errors | red + tint |
| `--warning` / `--warning-wash` | caution states | amber + tint |
| `--success` / `--success-wash` | confirmations, done states | green + tint |
| `--link` / `--link-hover` | inline text links | often == secondary |
| `--focus-ring` | keyboard focus outline | usually == accent |
| `--shadow-color` | `r,g,b` triple consumed by effects.css shadows | near-black, or `0,0,0` in dark |
| `--radius` | default control radius (opt) | base corner radius; omit to inherit `--radius-md` |
| `--radius-card` | card / panel radius (opt) | card corner radius; omit to inherit `--radius-lg` |

Semantic wash tokens in dark mode are frequently collapsed to one shared muted
surface (see flux `#3D3D60` / verso `#4E5C67`) — that's fine and reads well.

## typography.css

| Token | Role |
|---|---|
| `--font-display` | headings, brand — the character face; include full CSS fallback stack |
| `--font-body` | everything else |
| `--font-mono` | code, numbers, IDs |
| `--text-xs … --text-3xl` | type scale; tighten + enlarge for a "bench/tool" feel, open up for "editorial" |
| `--leading-tight/snug/normal/relaxed` | line heights |
| `--tracking-tight/normal/wide` | letter-spacing; sans usually slightly negative, serif ~0 |

## effects.css

| Token | Role |
|---|---|
| `--shadow-sm/md/lg` | elevation ramp; build from `rgba(var(--shadow-color), …)`. Soft + low alpha = calm; deeper = punchy |
| `--shadow-glow` | optional accent glow ring for focus/hover flourish |
| `--ease-standard` | shared easing curve |
| `--duration-fast` / `--duration-normal` | transition timings |
| `--border-width` | hairline width (usually `1px`) |
