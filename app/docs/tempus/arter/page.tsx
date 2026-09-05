import type { Metadata } from "next"
import { DocMarkdown } from "../../doc-markdown"
import { DocShell } from "../../doc-shell"
import { TempusDocsNav } from "../tempus-docs-nav"

export const metadata: Metadata = {
  title: "Arter — Tempus API",
  description: "Läs arter och deras checklistkopplingar i Tempus API.",
}

const DOC = `# Arter

## Lista arter

**Sökväg:** \`/api/tempus/species/\`

\`\`\`http
GET /api/tempus/species/?page=1&page_size=25 HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token din-token
Accept: application/json
\`\`\`

Svaret är paginerat. Varje art innehåller bland annat sitt Tempus-ID, Dyntaxa-ID,
svenskt och vetenskapligt namn samt information om biotoper och landskapstyper.

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
    "landscape_types": [],
    "biotopes": [],
    "synced_at": "2026-05-01T06:00:00Z",
    "created_at": "2026-01-10T09:00:00Z",
    "updated_at": "2026-05-01T06:00:00Z",
    "is_followed": false
  }]
}
\`\`\`

## Läs en art

**Sökväg:** \`/api/tempus/species/<art-uuid>/\`

\`\`\`http
GET /api/tempus/species/art-uuid/ HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token din-token
Accept: application/json
\`\`\`

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
du skapar en observation.`

export default function TempusSpeciesDocsPage() {
  return (
    <DocShell crumb="Dokumentation / Tempus / Arter" backHref="/docs/tempus" backLabel="Tempus API">
      <TempusDocsNav current="/docs/tempus/arter" />
      <DocMarkdown content={DOC} />
    </DocShell>
  )
}
