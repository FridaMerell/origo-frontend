import type { Metadata } from "next"
import { DocMarkdown } from "../doc-markdown"
import { DocShell } from "../doc-shell"

export const metadata: Metadata = {
  title: "Tempus API — Origo-dokumentation",
  description:
    "Externt API för Tempus: observationer. Kodexempel i http och C#, med token-autentisering.",
}

const DOC = `# Tempus API

Autentisering (\`Authorization: Token …\`) och pagineringskuvert beskrivs under
[Externt API](/docs). Den här sidan täcker Tempus-resurserna.

---

## Observationer

En observation är en fältnotering av en art, eventuellt kopplad till en eller
flera krysslistrader den uppfyller. Listendpointen returnerar **bara dina egna**
observationer.

Arten anges med sitt **taxonomiska ID** (Dyntaxa-taxon-id, ett heltal) — inte med
Tempus interna UUID.

## Checklistor på art

Ett artsvar kan innehålla de checklistor där arten finns. Använd den listan
direkt i gränssnittet; inga extra anrop behövs för att slå upp checklistor eller
checklistpunkter.

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

- \`id\` är checklistans id och \`name\` är dess visningsnamn.
- \`item_id\` är checklistpunkten. När användaren väljer en checklista ska just
  \`item_id\` läggas i observationens \`checklist_items\`.
- I snabbregistreringen sparas checklistans id, namn och checklistpunkt i state,
  så att en förvald checklista från checklistevyn följer med vid sparning.

**Sökväg:** \`/api/tempus/observations/\`

### Fält

| Fält | Typ | Beskrivning |
| --- | --- | --- |
| \`id\` | string (uuid) | Sätts av servern |
| \`user\` | number | Ägarens konto-id (läses ut) |
| \`species\` | number | Taxonomiskt ID (Dyntaxa-taxon-id). **Krävs** vid skapande |
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
| \`?species=<taxon-id>\` | Bara observationer av den arten |
| \`?checklist_items=<uuid>\` | Bara observationer kopplade till den raden |
| \`?page=<n>\` | Sidnummer |

### Lista observationer

\`\`\`http
GET /api/tempus/observations/?species=102983 HTTP/1.1
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
      "species": 102983,
      "checklist_items": [],
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
  "species": 102983,
  "observed_at": "2026-05-01T06:30:00Z",
  "location": { "type": "Point", "coordinates": [18.0686, 59.3293] },
  "count": 3,
  "notes": "Sjungande i alkärret",
  "checklist_items": []
}
\`\`\`

Servern svarar \`201 Created\` med den skapade observationen (inklusive \`id\`).

### C#

\`\`\`csharp
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

var http = new HttpClient { BaseAddress = new Uri("https://origin.api.fåvitsko.se") };
http.DefaultRequestHeaders.Authorization =
    new AuthenticationHeaderValue("Token", "9c8b7a6d5e4f3c2b1a09f8e7d6c5b4a3f2e1d0c9");

var speciesId = 102983; // taxonomiskt ID (Dyntaxa-taxon-id)

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
    ChecklistItems: Array.Empty<string>());

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
    [property: JsonPropertyName("species")] int Species,
    [property: JsonPropertyName("observed_at")] DateTimeOffset ObservedAt,
    [property: JsonPropertyName("count")] int? Count,
    [property: JsonPropertyName("notes")] string Notes);

record NewObservation(
    [property: JsonPropertyName("species")] int Species,
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
      <DocMarkdown content={DOC} />
    </DocShell>
  )
}
