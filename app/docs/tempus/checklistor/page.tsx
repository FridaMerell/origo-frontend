import type { Metadata } from "next"
import { DocMarkdown } from "../../doc-markdown"
import { DocShell } from "../../doc-shell"
import { TempusDocsNav } from "../tempus-docs-nav"

export const metadata: Metadata = {
  title: "Checklistor — Tempus API",
  description: "Läs checklistor och checklistpunkter i Tempus API.",
}

const DOC = `# Checklistor

## Lista checklistor

**Sökväg:** \`/api/tempus/checklists/\`

\`\`\`http
GET /api/tempus/checklists/?page=1 HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token din-token
Accept: application/json
\`\`\`

Svaret är en paginerad lista över dina checklistor.

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
    "route": null,
    "species_count": 24,
    "item_count": 24,
    "created_at": "2026-02-01T08:00:00Z",
    "updated_at": "2026-05-01T06:00:00Z"
  }]
}
\`\`\`

## Läs en checklista

**Sökväg:** \`/api/tempus/checklists/<checklista-uuid>/\`

\`\`\`http
GET /api/tempus/checklists/checklista-uuid/ HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token din-token
Accept: application/json
\`\`\`

Svaret är checklistobjektet. Läs checklistans rader med:

\`\`\`http
GET /api/tempus/checklist-items/?checklist=checklista-uuid HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token din-token
Accept: application/json
\`\`\`

Varje checklistpunkt innehåller \`id\`, \`checklist\`, \`species\`,
\`sequence\` och \`notes\`. Dess \`id\` används som \`checklist_items\` när
en observation kopplas till checklistan.`

export default function TempusChecklistsDocsPage() {
  return (
    <DocShell crumb="Dokumentation / Tempus / Checklistor" backHref="/docs/tempus" backLabel="Tempus API">
      <TempusDocsNav current="/docs/tempus/checklistor" />
      <DocMarkdown content={DOC} />
    </DocShell>
  )
}
