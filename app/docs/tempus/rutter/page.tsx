import type { Metadata } from "next"
import { DocMarkdown } from "../../doc-markdown"
import { DocShell } from "../../doc-shell"
import { TempusDocsNav } from "../tempus-docs-nav"

export const metadata: Metadata = {
  title: "Rutter — Tempus API",
  description: "Planera rutter med stopp och få föreslagna stopp längs vägen i Tempus API.",
}

const DOC = `# Rutter

En rutt är en planerad körsträcka. Längs den kan du lägga egna stopp och låta
Tempus föreslå stopp där det finns mycket att se, utifrån artfynd i en
korridor runt linjen.

## Rutter

**Sökväg:** \`/api/tempus/routes/\`

| Fält | Typ | Beskrivning |
| --- | --- | --- |
| \`id\` | string (uuid) | Sätts av servern |
| \`user\` | string | Ägaren (läses ut) |
| \`name\` | string | Namn. **Krävs** |
| \`planned_date\` | string (datum) | Planerat datum, \`YYYY-MM-DD\`. **Krävs** |
| \`geometry\` | GeoJSON LineString \\| null | Vägen, minst två punkter \`[longitud, latitud]\` |
| \`corridor_metres\` | number | Hur långt ut från linjen, åt vardera hållet, som stopp söks (heltal > 0) |
| \`created_at\`, \`updated_at\` | string (ISO 8601) | Sätts av servern |

\`\`\`http
POST /api/tempus/routes/ HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token din-token
Content-Type: application/json

{
  "name": "Till Öland",
  "planned_date": "2026-05-14",
  "corridor_metres": 2000,
  "geometry": {
    "type": "LineString",
    "coordinates": [[18.0686, 59.3293], [16.3616, 56.6634]]
  }
}
\`\`\`

Ändra med \`PATCH /api/tempus/routes/<id>/\` och ta bort med
\`DELETE /api/tempus/routes/<id>/\`.

## Egna stopp

**Sökväg:** \`/api/tempus/route-stops/\`

Lista en rutts stopp med \`?route=<rutt-uuid>\`.

| Fält | Typ | Beskrivning |
| --- | --- | --- |
| \`id\` | string (uuid) | Sätts av servern |
| \`route\` | string (uuid) | Rutten. **Krävs** |
| \`sequence\` | number | Ordning längs rutten. Unik per rutt |
| \`name\` | string | Namn. **Krävs** |
| \`location\` | GeoJSON Point | Position |
| \`planned_at\` | string (ISO 8601) \\| null | Planerad tid |

\`\`\`http
POST /api/tempus/route-stops/ HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token din-token
Content-Type: application/json

{
  "route": "rutt-uuid",
  "sequence": 1,
  "name": "Rastplats Kolmården",
  "location": { "type": "Point", "coordinates": [16.6833, 58.6667] },
  "planned_at": null
}
\`\`\`

Ta bort ett stopp med \`DELETE /api/tempus/route-stops/<id>/\`.

## Föreslagna stopp

Förslagen räknas fram i bakgrunden från artfynd hos Artdatabanken, vilket tar
en stund. Starta beräkningen med \`POST\` och fråga sedan med \`GET\` tills
den är klar. Varje rutt har en beräkning åt gången; en ny ersätter den förra.

**Sökväg:** \`/api/tempus/routes/<rutt-uuid>/suggested-stops/\`

\`\`\`http
POST /api/tempus/routes/rutt-uuid/suggested-stops/?num_stops=5&max_detour_m=3000 HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token din-token
\`\`\`

| Parameter | Effekt |
| --- | --- |
| \`taxon_id\` | Bara fynd inom ett Dyntaxa-taxon |
| \`since_days\` | Hur många dagar bakåt fynden räknas |
| \`notable_days\` | Hur många dagar bakåt anmärkningsvärda fynd tas med |
| \`max_detour_m\` | Längsta omväg från rutten, i meter |
| \`num_stops\` | Antal förslag |
| \`refresh=true\` | Räkna om även om ett resultat finns |

Både \`POST\` och \`GET\` svarar med beräkningens läge:

\`\`\`json
{
  "route": "rutt-uuid",
  "status": "succeeded",
  "params": { "num_stops": 5 },
  "result": [],
  "error": "",
  "created_at": "2026-05-10T08:00:00Z",
  "started_at": "2026-05-10T08:00:01Z",
  "finished_at": "2026-05-10T08:01:12Z"
}
\`\`\`

\`status\` är \`pending\`, \`running\`, \`succeeded\` eller \`failed\`. Vid
\`failed\` står orsaken i \`error\`. \`GET\` svarar \`404\` om ingen beräkning
har startats.

Varje förslag i \`result\`:

\`\`\`json
{
  "rank": 1,
  "score": 0.87,
  "breakdown": {
    "richness_term": 0.4,
    "evenness_term": 0.2,
    "rarity_term": 0.2,
    "recency_term": 0.07,
    "corrected_richness": 41
  },
  "location": { "type": "Point", "coordinates": [16.9, 58.4] },
  "locality": "Getåbrohöjden",
  "county": "Östergötland",
  "species_count": 41,
  "highlights": [{
    "taxon_id": 1,
    "scientific_name": "Turdus merula",
    "vernacular_name": "koltrast",
    "count": 3,
    "last_seen_days": 2,
    "red_list_category": "LC",
    "reason": ""
  }],
  "notable_recent": [],
  "top_species": [],
  "distance_along_route_m": 142000,
  "detour_m": 800
}
\`\`\`

\`score\` bygger på artrikedom, jämnhet, sällsynthet och hur nyliga fynden är;
\`breakdown\` visar delarna.`

export default function TempusRoutesDocsPage() {
  return (
    <DocShell crumb="Dokumentation / Tempus / Rutter" backHref="/docs/tempus" backLabel="Tempus API">
      <TempusDocsNav current="/docs/tempus/rutter" />
      <DocMarkdown content={DOC} />
    </DocShell>
  )
}
