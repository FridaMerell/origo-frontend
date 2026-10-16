import type { Metadata } from "next"
import { DocMarkdown } from "../../doc-markdown"
import { DocShell } from "../../doc-shell"
import { TempusDocsNav } from "../tempus-docs-nav"

export const metadata: Metadata = {
  title: "Arter — Tempus API",
  description:
    "Läs arter, kategorier, säsongsdata och följda arter i Tempus API, och registrera nya arter från Dyntaxa.",
}

const DOC = `# Arter

Artkatalogen bygger på Dyntaxa. Varje art har ett eget Tempus-ID (UUID) och
sitt Dyntaxa-ID (heltal). Observationer och checklistor använder Tempus-ID:t.

## Lista arter

**Sökväg:** \`/api/tempus/species/\`

\`\`\`http
GET /api/tempus/species/?page=1&page_size=25 HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token din-token
Accept: application/json
\`\`\`

\`page_size\` är högst 50. Filtrera på en kategori med
\`?categories__taxon_id=<dyntaxa-id>\`.

\`\`\`json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [{
    "id": "art-uuid",
    "dyntaxa_taxon_id": 1,
    "scientific_name": "Turdus merula",
    "swedish_name": "Koltrast",
    "taxon_rank": "species",
    "parent_dyntaxa_taxon_id": 123,
    "is_active": true,
    "stages": [],
    "api_data": {},
    "landscape_types": [],
    "biotopes": [],
    "synced_at": "2026-05-01T06:00:00Z",
    "created_at": "2026-01-10T09:00:00Z",
    "updated_at": "2026-05-01T06:00:00Z",
    "is_followed": false
  }]
}
\`\`\`

| Fält | Typ | Beskrivning |
| --- | --- | --- |
| \`id\` | string (uuid) | Tempus-ID |
| \`dyntaxa_taxon_id\` | number | Dyntaxa-ID |
| \`scientific_name\`, \`swedish_name\` | string | Namn |
| \`taxon_rank\` | string | Taxonomisk nivå, t.ex. \`species\` |
| \`parent_dyntaxa_taxon_id\` | number \\| null | Överordnat taxon i Dyntaxa |
| \`stages\` | string[] | Artens livsstadier. Används som förval för \`life_stage\` på observationer |
| \`api_data\` | object \\| null | Dyntaxas rådata för taxonet |
| \`landscape_types\`, \`biotopes\` | object[] | Landskapstyper och biotoper: \`id\`, \`code\`, \`name\` och \`significance\` (hur starkt arten är knuten dit) |
| \`is_followed\` | boolean | Om du följer arten |
| \`checklists\` | object[] | Bara i detaljsvaret, se nedan |

## Läs en art

**Sökväg:** \`/api/tempus/species/<art-uuid>/\`

Svaret är ett artobjekt som ovan. Om arten finns i någon av dina checklistor
innehåller det även \`checklists\`:

\`\`\`json
{
  "id": "art-uuid",
  "checklists": [{
    "id": "checklista-uuid",
    "item_id": "checklistpunkt-uuid",
    "name": "Stenmovägen"
  }]
}
\`\`\`

\`checklists[].id\` identifierar checklistan och \`checklists[].item_id\`
identifierar dess rad för arten. Använd \`item_id\` i \`checklist_items\` när
du skapar en observation.

## Läs flera arter

\`POST /api/tempus/species/resolve/\` med \`{ "ids": ["art-uuid", …] }\` svarar
med en lista av artobjekt. Skicka högst 100 id:n per anrop.

---

## Säsong

### Fenogram

\`GET /api/tempus/species/<art-uuid>/phenogram/\` returnerar artens
aktivitetskurva över året, beräknad från fynd i Artdatabankens Species
Observation System. Lägg till
\`?geo_area=<område-uuid>\` för att begränsa till ett område.

\`\`\`json
{
  "species": "art-uuid",
  "geo_area": null,
  "years": 10,
  "record_count": 18234,
  "peak_week": 16,
  "activity_window": { "start_week": 9, "end_week": 41 },
  "start_day_of_year": 60,
  "end_day_of_year": 285,
  "confidence": 0.92,
  "seasonal_status": {
    "status": "in_season",
    "is_in_season": true,
    "is_coming_into_season": false,
    "is_going_out_of_season": false,
    "at_peak": false,
    "days_until_start": null,
    "days_until_end": 74
  },
  "weeks": [
    { "week": 1, "count": 12, "smoothed": 0.004, "fraction": 0.001 }
  ]
}
\`\`\`

\`weeks\` har 52 veckor. \`fraction\` är veckans andel av årets fynd (0–1) och
\`smoothed\` samma värde efter utjämning. \`seasonal_status.status\` är en av
\`out_of_season\`, \`coming_into_season\`, \`in_season\`, \`at_peak\` och
\`going_out_of_season\`.

### Säsongsöversikt

\`GET /api/tempus/species/seasonal-overview/\` är en paginerad lista
(\`page_size\` högst 50) med varje arts säsongsläge, utan veckodata. Den kan
läsas utan token.

\`\`\`json
{
  "id": "art-uuid",
  "dyntaxa_taxon_id": 1,
  "scientific_name": "Turdus merula",
  "swedish_name": "Koltrast",
  "is_followed": false,
  "record_count": 18234,
  "seasonal_status": { "status": "in_season" },
  "activity_window": { "start_week": 9, "end_week": 41 },
  "peak_week": 16,
  "habitats": [],
  "landscape_types": [],
  "confidence": 0.92
}
\`\`\`

\`GET /api/tempus/species/seasonal-landscapes/\` grupperar samma översikt per
landskapstyp: \`{ "results": [{ "name", "code", "count", "species": [...] }] }\`.
En art som hör till flera landskapstyper räknas under var och en.

---

## Kategorier

**Sökväg:** \`/api/tempus/species-categories/\`

En kategori är en utvald grupp arter, rotad i ett Dyntaxa-taxon. Listan är
paginerad (\`page_size\` högst 50) och kan filtreras med
\`?taxon_id=<dyntaxa-id>\`.

| Fält | Typ | Beskrivning |
| --- | --- | --- |
| \`id\` | string (uuid) | Kategorins id |
| \`label\` | string | Namn |
| \`taxon_id\` | number \\| null | Dyntaxa-taxon kategorin utgår från |
| \`parent_category\` | string \\| null | Överordnad kategori |
| \`stages\` | string[] | Livsstadier för kategorins arter |
| \`image_url\` | string | Bild |
| \`is_primary\` | boolean | Huvudkategori |
| \`species\` | string[] (uuid) | Arterna i kategorin |
| \`species_count\` | number | Antal arter |

## Registrera arter från Dyntaxa

Sök efter taxon i Dyntaxa:

\`\`\`http
GET /api/tempus/species/search/?q=koltrast&under_taxon_id=<dyntaxa-id> HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token din-token
Accept: application/json
\`\`\`

\`q\` måste vara minst två tecken. \`under_taxon_id\` är valfritt och begränsar
träffarna till en gren av trädet. Svaret är en lista med \`taxon_id\`,
\`scientific_name\`, \`swedish_name\` och \`taxon_rank\`.

Lägg sedan till ett taxon i en kategori:

\`\`\`http
POST /api/tempus/species/register/ HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token din-token
Content-Type: application/json

{
  "species_category": "kategori-uuid",
  "dyntaxa_taxon_id": 1
}
\`\`\`

Observera att sökningen svarar med \`taxon_id\` medan registreringen tar emot
\`dyntaxa_taxon_id\`.

Flera arter kan importeras från en CSV-fil med
\`POST /api/tempus/species/import-checklist/\`. Skicka \`multipart/form-data\`
med fälten \`species_category\` och \`file\`.

---

## Följa arter

**Sökväg:** \`/api/tempus/species-follows/\`

\`species\` är artens **Dyntaxa-ID**, inte Tempus-ID:t.

\`\`\`http
POST /api/tempus/species-follows/ HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token din-token
Content-Type: application/json

{
  "species": 1,
  "priority": 2,
  "notifications_enabled": false
}
\`\`\`

- \`GET /api/tempus/species-follows/my_follows/\` listar arterna du följer.
- \`PATCH /api/tempus/species-follows/<id>/\` ändrar en följning, t.ex.
  \`notifications_enabled\`.
- \`DELETE /api/tempus/species-follows/unfollow/?species=<dyntaxa-id>\` slutar
  följa arten.`

export default function TempusSpeciesDocsPage() {
  return (
    <DocShell crumb="Dokumentation / Tempus / Arter" backHref="/docs/tempus" backLabel="Tempus API">
      <TempusDocsNav current="/docs/tempus/arter" />
      <DocMarkdown content={DOC} />
    </DocShell>
  )
}
