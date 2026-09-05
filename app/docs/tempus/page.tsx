import type { Metadata } from "next"
import { DocMarkdown } from "../doc-markdown"
import { DocShell } from "../doc-shell"
import { TempusDocsNav } from "./tempus-docs-nav"

export const metadata: Metadata = {
  title: "Tempus API — Origo-dokumentation",
  description:
    "Externt API för Tempus: arter, checklistor och observationer. Kodexempel i http och C#, med token-autentisering.",
}

const DOC = `# Tempus API

Autentisering (\`Authorization: Token …\`) och pagineringskuvert beskrivs under
[Externt API](/docs). Den här sidan täcker Tempus-resurserna.

---

## Observationer

En observation är en fältnotering av en art, eventuellt kopplad till en eller
flera krysslistrader den uppfyller. Listendpointen returnerar **bara dina egna**
observationer.

Arten anges med sitt Tempus-ID (UUID).

## Koppla en observation till checklistor

När en art hämtas följer dess relevanta checklistor med i artsvaret. Det behövs
inte något extra anrop för att hitta rätt checklistpunkt.

\`\`\`json
{
  "id": "art-uuid",
  "checklists": [
    {
      "id": "checklista-uuid",
      "item_id": "checklistpunkt-uuid",
      "name": "Stenmovägen"
    }
  ]
}
\`\`\`

- \`checklists[].id\` identifierar checklistan. Använd det för visning och
  lokal hantering.
- \`checklists[].name\` är namnet som visas för användaren.
- \`checklists[].item_id\` identifierar raden för just den här arten. Det är
  **detta id** som skickas i \`checklist_items\` när observationen sparas.

Exempel: om användaren registrerar arten ovan i *Stenmovägen* skickas

\`\`\`json
{
  "species": "art-uuid",
  "checklist_items": ["checklistpunkt-uuid"]
}
\`\`\`

I snabbregistreringen är checklistorna från artsvaret valda från början. Om
registreringen öppnas från en checklistevy väljs den aktuella checklistpunkten
direkt.

**Sökväg:** \`/api/tempus/observations/\`

### Fält

| Fält | Typ | Beskrivning |
| --- | --- | --- |
| \`id\` | string (uuid) | Sätts av servern |
| \`user\` | number | Ägarens konto-id (läses ut) |
| \`species\` | string (uuid) | Tempus-ID för arten. **Krävs** vid skapande |
| \`species_detail\` | object | Läsbar artinformation: \`dyntaxa_taxon_id\` och \`swedish_name\`. Skrivskyddat. |
| \`checklist_items\` | string[] (uuid) | Krysslistrader observationen uppfyller |
| \`checklist_names\` | string[] | Namn på berörda krysslistor (läses ut) |
| \`observed_at\` | string (ISO 8601) | Tidpunkt. **Krävs** vid skapande |
| \`location\` | GeoJSON Point \| \`{}\` | Position, eller tomt objekt |
| \`count\` | number \| null | Antal individer (heltal ≥ 1) eller \`null\` |
| \`notes\` | string | Fritext |
| \`created_at\` | string (ISO 8601) | Sätts av servern |

### Filter

| Parameter | Effekt |
| --- | --- |
| \`?species=<art-uuid>\` | Bara observationer av den arten |
| \`?checklist_items=<uuid>\` | Bara observationer kopplade till den raden |
| \`?page=<n>\` | Sidnummer |

### Lista observationer

\`\`\`http
GET /api/tempus/observations/?species=art-uuid HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token 9c8b7a6d5e4f3c2b1a09f8e7d6c5b4a3f2e1d0c9
Accept: application/json
\`\`\`

\`\`\`json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "1b4e28ba-2fa1-11d2-883f-0016d3cca427",
      "user": 12,
      "species": "art-uuid",
      "species_detail": {
        "dyntaxa_taxon_id": 1,
        "swedish_name": "Koltrast"
      },
      "checklist_items": ["checklistpunkt-uuid"],
      "checklist_names": [],
      "observed_at": "2026-05-01T06:30:00Z",
      "location": { "type": "Point", "coordinates": [18.0686, 59.3293] },
      "count": 3,
      "notes": "Sjungande i alkärret",
      "created_at": "2026-05-01T07:12:44Z"
    }
  ]
}
\`\`\`

### Skapa en observation

\`\`\`http
POST /api/tempus/observations/ HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token 9c8b7a6d5e4f3c2b1a09f8e7d6c5b4a3f2e1d0c9
Content-Type: application/json

{
  "species": "art-uuid",
  "observed_at": "2026-05-01T06:30:00Z",
  "location": { "type": "Point", "coordinates": [18.0686, 59.3293] },
  "count": 3,
  "notes": "Sjungande i alkärret",
  "checklist_items": ["checklistpunkt-uuid"]
}
\`\`\`

### Serverns svar

Servern svarar \`201 Created\` med den skapade observationen. Fältet
\`species_detail\` läggs till av servern och ska inte skickas i POST-anropet.

\`\`\`json
{
  "id": "1b4e28ba-2fa1-11d2-883f-0016d3cca427",
  "user": 12,
  "species": "art-uuid",
  "species_detail": {
    "dyntaxa_taxon_id": 1,
    "swedish_name": "Koltrast"
  },
  "checklist_items": ["checklistpunkt-uuid"],
  "checklist_names": ["Stenmovägen"],
  "observed_at": "2026-05-01T06:30:00Z",
  "location": { "type": "Point", "coordinates": [18.0686, 59.3293] },
  "count": 3,
  "notes": "Sjungande i alkärret",
  "created_at": "2026-05-01T07:12:44Z"
}
\`\`\`

### C#

\`\`\`csharp
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

var http = new HttpClient { BaseAddress = new Uri("https://origin.api.fåvitsko.se") };
http.DefaultRequestHeaders.Authorization =
    new AuthenticationHeaderValue("Token", "9c8b7a6d5e4f3c2b1a09f8e7d6c5b4a3f2e1d0c9");

var speciesId = "art-uuid"; // Tempus-ID för arten

// Lista observationer för en art och följ pagineringen.
var observations = new List<Observation>();
string? url = $"/api/tempus/observations/?species={speciesId}";
while (url is not null)
{
    var page = await http.GetFromJsonAsync<Page<Observation>>(url)
               ?? throw new InvalidOperationException("Tomt svar.");
    observations.AddRange(page.Results);
    url = page.Next;
}
Console.WriteLine($"{observations.Count} observationer.");

// Skapa en observation.
var draft = new NewObservation(
    Species: speciesId,
    ObservedAt: DateTimeOffset.Parse("2026-05-01T06:30:00Z"),
    Location: new Point("Point", new[] { 18.0686, 59.3293 }),
    Count: 3,
    Notes: "Sjungande i alkärret",
    ChecklistItems: new[] { "checklistpunkt-uuid" });

var response = await http.PostAsJsonAsync("/api/tempus/observations/", draft);
response.EnsureSuccessStatusCode();
var created = await response.Content.ReadFromJsonAsync<Observation>();
Console.WriteLine($"Skapade {created!.Id}");

record Page<T>(
    [property: JsonPropertyName("count")] int Count,
    [property: JsonPropertyName("next")] string? Next,
    [property: JsonPropertyName("previous")] string? Previous,
    [property: JsonPropertyName("results")] List<T> Results);

record Point(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("coordinates")] double[] Coordinates);

record Observation(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("species")] string Species,
    [property: JsonPropertyName("species_detail")] SpeciesDetail SpeciesDetail,
    [property: JsonPropertyName("observed_at")] DateTimeOffset ObservedAt,
    [property: JsonPropertyName("count")] int? Count,
    [property: JsonPropertyName("notes")] string Notes);

record SpeciesDetail(
    [property: JsonPropertyName("dyntaxa_taxon_id")] int DyntaxaTaxonId,
    [property: JsonPropertyName("swedish_name")] string SwedishName);

record NewObservation(
    [property: JsonPropertyName("species")] string Species,
    [property: JsonPropertyName("observed_at")] DateTimeOffset ObservedAt,
    [property: JsonPropertyName("location")] Point Location,
    [property: JsonPropertyName("count")] int? Count,
    [property: JsonPropertyName("notes")] string Notes,
    [property: JsonPropertyName("checklist_items")] string[] ChecklistItems);
\`\`\`
`

export default function TempusDocsPage() {
  return (
    <DocShell crumb="Dokumentation / Tempus">
      <TempusDocsNav current="/docs/tempus" />
      <DocMarkdown content={DOC} />
    </DocShell>
  )
}
