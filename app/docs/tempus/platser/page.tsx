import type { Metadata } from "next"
import { DocMarkdown } from "../../doc-markdown"
import { DocShell } from "../../doc-shell"
import { TempusDocsNav } from "../tempus-docs-nav"

export const metadata: Metadata = {
  title: "Platser och områden — Tempus API",
  description:
    "Platser, områden och intressanta lokaler i Tempus API.",
}

const DOC = `# Platser och områden

En **plats** är ett eget ritat område, till exempel en sommarstuga eller en
lokal du besöker ofta. Den är din och har ett heltals-id. Ett **område** är ett
gemensamt geografiskt område som ett län, ett landskap eller ett naturreservat,
med UUID. Checklistor kan knytas till både en plats (\`locale\`) och ett område
(\`geo_area\`).

All geometri är GeoJSON i WGS84 med koordinater som \`[longitud, latitud]\`.

## Platser

**Sökväg:** \`/api/tempus/locales/\`

| Fält | Typ | Beskrivning |
| --- | --- | --- |
| \`id\` | number | Sätts av servern |
| \`name\` | string | Namn. **Krävs** |
| \`geometry\` | GeoJSON MultiPolygon \\| null | Platsens yta. Varje ring har minst fyra punkter, där den sista är samma som den första |
| \`user\` | number | Ägarens konto-id (läses ut) |

\`\`\`http
POST /api/tempus/locales/ HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token din-token
Content-Type: application/json

{
  "name": "Stugan",
  "geometry": {
    "type": "MultiPolygon",
    "coordinates": [[[
      [18.10, 59.40], [18.12, 59.40], [18.12, 59.41], [18.10, 59.40]
    ]]]
  }
}
\`\`\`

Ändra med \`PATCH /api/tempus/locales/<id>/\` och ta bort med
\`DELETE /api/tempus/locales/<id>/\`.

## Områden

**Sökväg:** \`/api/tempus/geo-areas/\`

| Fält | Typ | Beskrivning |
| --- | --- | --- |
| \`id\` | string (uuid) | Sätts av servern |
| \`name\` | string | Namn. **Krävs** |
| \`kind\` | string | \`country\`, \`county\`, \`province\`, \`nature_reserve\` eller \`biological_area\` |
| \`country_code\` | string | Landskod, t.ex. \`SE\` |
| \`geometry\` | GeoJSON Polygon/MultiPolygon \\| null | Områdets yta |

Listan innehåller varje områdes geometri och kan därför vara stor. Nya områden
skapas med \`POST\` och en \`MultiPolygon\`.

---

## Intressanta lokaler

\`GET /api/tempus/interesting-spots/\` rankar lokaler runt en punkt efter
artfynd.

| Parameter | Effekt |
| --- | --- |
| \`longitude\`, \`latitude\` | Punkten. **Krävs** |
| \`radius_m\` | Sökradie i meter |
| \`taxon_id\` | Bara fynd inom ett Dyntaxa-taxon |
| \`since_days\` | Hur många dagar bakåt fynden räknas |
| \`notable_days\` | Hur många dagar bakåt anmärkningsvärda fynd tas med |
| \`num_spots\` | Antal lokaler |

\`\`\`json
{
  "point": { "type": "Point", "coordinates": [18.0686, 59.3293] },
  "radius_m": 10000,
  "count": 1,
  "spots": [{
    "rank": 1,
    "locality": "Lill-Jansskogen",
    "location": { "type": "Point", "coordinates": [18.07, 59.35] },
    "distance_m": 2300,
    "municipality": "Stockholm",
    "county": "Stockholm",
    "score": 0.74,
    "species_count": 38,
    "highlights": [],
    "notable_recent": [],
    "top_species": []
  }]
}
\`\`\``

export default function TempusPlacesDocsPage() {
  return (
    <DocShell crumb="Dokumentation / Tempus / Platser och områden" backHref="/docs/tempus" backLabel="Tempus API">
      <TempusDocsNav current="/docs/tempus/platser" />
      <DocMarkdown content={DOC} />
    </DocShell>
  )
}
