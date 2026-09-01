import type { Metadata } from "next"
import { DocMarkdown } from "../doc-markdown"
import { DocShell } from "../doc-shell"

export const metadata: Metadata = {
  title: "Flux API — Origo-dokumentation",
  description:
    "Externt API för Flux: projekt. Kodexempel i http och C#, med token-autentisering.",
}

const DOC = `# Flux API

Autentisering (\`Authorization: Token …\`) och pagineringskuvert beskrivs under
[Externt API](/docs). Den här sidan täcker Flux-resurserna.

---

## Projekt

Ett projekt är den översta nivån i Flux och samlar milstolpar, uppgifter,
uppdateringar och dokument. Du ser bara projekt du är medlem i.

**Sökväg:** \`/api/flux/projects/\`

### Fält

| Fält | Typ | Beskrivning |
| --- | --- | --- |
| \`id\` | number | Sätts av servern |
| \`name\` | string | Projektnamn. **Krävs** vid skapande |
| \`description\` | string | Fritext (Markdown) |
| \`members\` | number[] | Konto-id för medlemmar |
| \`files\` | string[] | URL:er till bifogade filer |
| \`created_at\` | string (ISO 8601) | Sätts av servern |
| \`updated_at\` | string (ISO 8601) | Sätts av servern |

Relaterade endpoints, filtrerade på projekt:
\`/api/flux/milestones/?project=<id>\`, \`/api/flux/tasks/?project=<id>\`,
\`/api/flux/updates/?project=<id>\`, \`/api/flux/documents/?project=<id>\` och
tavlan \`/api/flux/projects/<id>/board/\`.

### Lista projekt

\`\`\`http
GET /api/flux/projects/ HTTP/1.1
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
      "id": 7,
      "name": "Renovering norra längan",
      "description": "Tak, fönster och fasad.",
      "members": [12, 15],
      "files": [],
      "created_at": "2026-02-10T09:00:00Z",
      "updated_at": "2026-08-21T14:33:10Z"
    }
  ]
}
\`\`\`

### Hämta ett projekt

\`\`\`http
GET /api/flux/projects/7/ HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token 9c8b7a6d5e4f3c2b1a09f8e7d6c5b4a3f2e1d0c9
Accept: application/json
\`\`\`

### Skapa ett projekt

\`\`\`http
POST /api/flux/projects/ HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token 9c8b7a6d5e4f3c2b1a09f8e7d6c5b4a3f2e1d0c9
Content-Type: application/json

{
  "name": "Renovering norra längan",
  "description": "Tak, fönster och fasad.",
  "members": [12, 15]
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

// Lista alla projekt.
var projects = new List<Project>();
string? url = "/api/flux/projects/";
while (url is not null)
{
    var page = await http.GetFromJsonAsync<Page<Project>>(url)
               ?? throw new InvalidOperationException("Tomt svar.");
    projects.AddRange(page.Results);
    url = page.Next;
}
foreach (var p in projects)
    Console.WriteLine($"#{p.Id} {p.Name} ({p.Members.Count} medlemmar)");

// Hämta ett projekt.
var project = await http.GetFromJsonAsync<Project>("/api/flux/projects/7/");

// Skapa ett projekt.
var draft = new NewProject(
    Name: "Renovering norra längan",
    Description: "Tak, fönster och fasad.",
    Members: new[] { 12, 15 });

var response = await http.PostAsJsonAsync("/api/flux/projects/", draft);
response.EnsureSuccessStatusCode();
var created = await response.Content.ReadFromJsonAsync<Project>();
Console.WriteLine($"Skapade projekt #{created!.Id}");

record Page<T>(
    [property: JsonPropertyName("count")] int Count,
    [property: JsonPropertyName("next")] string? Next,
    [property: JsonPropertyName("previous")] string? Previous,
    [property: JsonPropertyName("results")] List<T> Results);

record Project(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("description")] string Description,
    [property: JsonPropertyName("members")] List<int> Members,
    [property: JsonPropertyName("files")] List<string> Files,
    [property: JsonPropertyName("created_at")] DateTimeOffset CreatedAt,
    [property: JsonPropertyName("updated_at")] DateTimeOffset UpdatedAt);

record NewProject(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("description")] string Description,
    [property: JsonPropertyName("members")] int[] Members);
\`\`\`
`

export default function FluxDocsPage() {
  return (
    <DocShell crumb="Dokumentation / Flux">
      <DocMarkdown content={DOC} />
    </DocShell>
  )
}
