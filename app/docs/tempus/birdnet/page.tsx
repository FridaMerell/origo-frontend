import type { Metadata } from "next"
import { DocMarkdown } from "../../doc-markdown"
import { DocShell } from "../../doc-shell"
import { TempusDocsNav } from "../tempus-docs-nav"

export const metadata: Metadata = {
  title: "BirdNET — Tempus API",
  description: "BirdNET-enheter och den löpande strömmen av fågeldetektioner i Tempus API.",
}

const DOC = `# BirdNET

En BirdNET-enhet är en dator med mikrofon (till exempel en Raspberry Pi) som
lyssnar efter fågelsång och rapporterar vad den hör. Tempus håller reda på
enheterna och skickar ut detektionerna som en ström.

## Enheter

**Sökväg:** \`/api/tempus/birdnet-devices/\`

Du ser de enheter du är användare på.

| Fält | Typ | Beskrivning |
| --- | --- | --- |
| \`id\` | string (uuid) | Sätts av servern |
| \`identifier\` | string | Enhetens eget id, t.ex. \`pi-birdnet-001\`. **Krävs** |
| \`name\` | string | Namn. **Krävs** |
| \`users\` | number[] | Konto-id som ser enheten. Minst ett |
| \`house\` | string \\| null | Hus i Verso som enheten står i |
| \`is_active\` | boolean | Om enheten är aktiv |
| \`created_at\`, \`updated_at\` | string (ISO 8601) | Sätts av servern |

\`\`\`http
POST /api/tempus/birdnet-devices/ HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token din-token
Content-Type: application/json

{
  "identifier": "pi-birdnet-001",
  "name": "Trädgården",
  "users": [12],
  "house": null,
  "is_active": true
}
\`\`\`

Ändra en enhet med \`PATCH /api/tempus/birdnet-devices/<id>/\`.

## Detektionsström

Detektionerna skickas som Server-Sent Events. Strömmen ligger utanför
\`/api/tempus/\`:

\`\`\`http
GET /api/birdnet/detections/stream?replay_seconds=3600 HTTP/1.1
Host: origin.api.fåvitsko.se
Accept: text/event-stream
\`\`\`

Strömmen innehåller detektioner från alla enheter du ser. Med
\`replay_seconds\` (0–86400) får du först de senaste sekundernas detektioner;
86400 är hela det sparade dygnet. Varje detektion kommer som en händelse av
typen \`detection\`:

\`\`\`text
event: detection
data: {"id":"detektion-uuid","species":"Turdus merula", …}
\`\`\`

\`\`\`json
{
  "id": "detektion-uuid",
  "species": "Turdus merula",
  "matched_species": {
    "id": "art-uuid",
    "dyntaxa_taxon_id": 1,
    "scientific_name": "Turdus merula",
    "swedish_name": "Koltrast"
  },
  "confidence": 0.91,
  "detectedAt": "2026-05-01T04:12:09Z",
  "device_id": "pi-birdnet-001",
  "created_at": "2026-05-01T04:12:11Z"
}
\`\`\`

| Fält | Beskrivning |
| --- | --- |
| \`id\` | Detektionens id. Använd det för att sortera bort dubbletter |
| \`species\` | BirdNETs vetenskapliga namn, oöversatt |
| \`matched_species\` | Arten i Tempus som namnet matchades mot, eller \`null\` om ingen matchning hittades |
| \`confidence\` | Säkerhet, 0–1 |
| \`detectedAt\` | När enheten hörde fågeln. Observera camelCase |
| \`device_id\` | Enhetens \`identifier\` |
| \`created_at\` | När servern sparade detektionen |

Om anslutningen bryts återupptar en webbläsare strömmen själv med
\`Last-Event-ID\`; \`replay_seconds\` gäller bara den första anslutningen.

I webbläsaren:

\`\`\`js
const url = "https://origin.api.fåvitsko.se/api/birdnet/detections/stream?replay_seconds=3600"
const stream = new EventSource(url, { withCredentials: true })
stream.addEventListener("detection", (event) => {
  const detection = JSON.parse(event.data)
  console.log(detection.matched_species?.swedish_name ?? detection.species)
})
\`\`\`

\`EventSource\` kan inte skicka egna headers, så i webbläsaren används
sessionscookien från inloggningen i Origo.`

export default function TempusBirdnetDocsPage() {
  return (
    <DocShell crumb="Dokumentation / Tempus / BirdNET" backHref="/docs/tempus" backLabel="Tempus API">
      <TempusDocsNav current="/docs/tempus/birdnet" />
      <DocMarkdown content={DOC} />
    </DocShell>
  )
}
