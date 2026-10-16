import type { Metadata } from "next"
import { DocMarkdown } from "../../doc-markdown"
import { DocShell } from "../../doc-shell"
import { TempusDocsNav } from "../tempus-docs-nav"

export const metadata: Metadata = {
  title: "Checklistor — Tempus API",
  description: "Läs, skapa och ändra checklistor och checklistpunkter i Tempus API.",
}

const DOC = `# Checklistor

En checklista är en lista över arter att leta efter, till exempel för ett
område, en inventering eller en utflykt. Varje art i listan är en
**checklistpunkt** med eget id. Det är punktens id som en observation kopplas
till.

## Lista checklistor

**Sökväg:** \`/api/tempus/checklists/\`

\`\`\`http
GET /api/tempus/checklists/?page=1 HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token din-token
Accept: application/json
\`\`\`

\`\`\`json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [{
    "id": "checklista-uuid",
    "name": "Stenmovägen",
    "description": "Vårens fåglar",
    "auto_add": false,
    "start_date": "2026-03-01",
    "end_date": "2026-06-01",
    "geo_area": "omrade-uuid",
    "geo_area_name": "Södermanland",
    "locale": null,
    "route": null,
    "species_count": 24,
    "item_count": 24,
    "completed_species_count": 9,
    "created_at": "2026-02-01T08:00:00Z",
    "updated_at": "2026-05-01T06:00:00Z"
  }]
}
\`\`\`

| Fält | Typ | Beskrivning |
| --- | --- | --- |
| \`id\` | string (uuid) | Sätts av servern |
| \`name\` | string | Namn. **Krävs** |
| \`description\` | string | Fritext |
| \`auto_add\` | boolean | Lägg till arter automatiskt i listan |
| \`start_date\`, \`end_date\` | string (datum) \\| null | Period, \`YYYY-MM-DD\`. Slutdatum får inte vara före startdatum |
| \`geo_area\` | string (uuid) \\| null | Område |
| \`geo_area_name\` | string \\| null | Områdets namn (läses ut) |
| \`locale\` | number \\| null | Plats |
| \`route\` | string \\| null | Rutt |
| \`species_count\`, \`item_count\` | number | Antal arter och punkter (läses ut) |
| \`completed_species_count\` | number | Antal arter i listan som har observerats (läses ut) |
| \`created_at\`, \`updated_at\` | string (ISO 8601) | Sätts av servern |

## Skapa en checklista

Arterna skickas med när listan skapas, antingen som enskilda arter, som hela
kategorier eller båda. Minst en av dem måste anges.

\`\`\`http
POST /api/tempus/checklists/ HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token din-token
Content-Type: application/json

{
  "name": "Stenmovägen",
  "description": "Vårens fåglar",
  "auto_add": false,
  "start_date": "2026-03-01",
  "end_date": "2026-06-01",
  "geo_area": "omrade-uuid",
  "locale": null,
  "route": null,
  "species": ["art-uuid"],
  "species_category_ids": ["kategori-uuid"]
}
\`\`\`

Svaret är den skapade checklistan.

## Ändra en checklista

\`PATCH /api/tempus/checklists/<checklista-uuid>/\` ändrar listans uppgifter
(\`name\`, \`description\`, \`auto_add\`, \`start_date\`, \`end_date\`,
\`geo_area\`, \`locale\`). Arter läggs till och tas bort via checklistpunkterna
nedan.

## Checklistpunkter

**Sökväg:** \`/api/tempus/checklist-items/\`

Lista en checklistas punkter med \`?checklist=<checklista-uuid>\`. Varje punkt
har \`id\`, \`checklist\`, \`species\`, \`sequence\` och \`notes\`.

Lägg till en art:

\`\`\`http
POST /api/tempus/checklist-items/ HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token din-token
Content-Type: application/json

{
  "checklist": "checklista-uuid",
  "species": "art-uuid",
  "sequence": 25,
  "notes": ""
}
\`\`\`

Ta bort en art med \`DELETE /api/tempus/checklist-items/<punkt-uuid>/\`.

## Register

\`GET /api/tempus/checklists/<checklista-uuid>/register/\` listar listans
arter tillsammans med om de har observerats. Det är den vy som visar hur långt
man har kommit.

| Parameter | Effekt |
| --- | --- |
| \`?search=<text>\` | Sök på artnamn |
| \`?is_completed=true\` | Bara observerade arter (\`false\` för de som återstår) |
| \`?page=<n>\`, \`?page_size=<n>\` | Paginering, högst 250 per sida |

\`\`\`json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [{
    "id": "checklistpunkt-uuid",
    "sequence": 1,
    "notes": "",
    "species_id": "art-uuid",
    "swedish_name": "Koltrast",
    "scientific_name": "Turdus merula",
    "dyntaxa_taxon_id": 1,
    "is_observed": true,
    "latest_observation_id": "observation-uuid"
  }]
}
\`\`\`

## Synkronisera med en kategori

Lägger till arter från en kategori i checklistan. Befintliga observationer av
de nya arterna kopplas automatiskt till de nya checklistpunkterna.

\`\`\`http
POST /api/tempus/checklists/checklista-uuid/sync-category/ HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token din-token
Content-Type: application/json

{
  "species_category_id": "kategori-uuid"
}
\`\`\`

## Koppla befintliga observationer till alla checklistor

\`POST /api/tempus/observations/sync-checklists/\` går igenom dina
observationer och kopplar dem till matchande punkter i alla dina checklistor.
För en enskild lista sker detta redan när du synkroniserar en kategori.`

export default function TempusChecklistsDocsPage() {
  return (
    <DocShell crumb="Dokumentation / Tempus / Checklistor" backHref="/docs/tempus" backLabel="Tempus API">
      <TempusDocsNav current="/docs/tempus/checklistor" />
      <DocMarkdown content={DOC} />
    </DocShell>
  )
}
