import type { Metadata } from "next"
import { DocMarkdown } from "../doc-markdown"
import { DocShell } from "../doc-shell"

export const metadata: Metadata = {
  title: "Flux API — Origo-dokumentation",
  description:
    "Externt API för Flux: projekt, milstolpar, uppgifter, uppdateringar, dokument, designmodell och kodgenerering. Kodexempel i http och C#, med token-autentisering.",
}

const DOC = `# Flux API

Autentisering (\`Authorization: Token …\`) och pagineringskuvert beskrivs under
[Externt API](/docs). Den här sidan täcker Flux-resurserna.

Flux har två delar. **Planering** är projekt, milstolpar, uppgifter,
uppdateringar och dokument. **Modell** är den tekniska beskrivningen av en app
som ska byggas: entiteter, fält, relationer, API-resurser, roller, skärmar,
integrationer och seed-data. Modellen kan genereras till kod.

Alla id:n i Flux är heltal. Du ser och ändrar bara projekt du är medlem i;
allt annat i Flux hör till ett projekt och följer samma behörighet. Svarar
servern \`403\` är du inte medlem i objektets projekt.

---

## Projekt

Ett projekt är den översta nivån och samlar planering och modell.

**Sökväg:** \`/api/flux/projects/\`

| Fält | Typ | Beskrivning |
| --- | --- | --- |
| \`id\` | number | Sätts av servern |
| \`name\` | string | Projektnamn. **Krävs** vid skapande |
| \`description\` | string | Fritext (Markdown) |
| \`members\` | number[] | Konto-id för medlemmar |
| \`files\` | string[] | URL:er till bifogade filer |
| \`identity\` | number \\| null | Visuell identitet (se Identiteter nedan) |
| \`include_identity\` | boolean | Om identiteten ska följa med i kodgenereringen |
| \`created_at\` | string (ISO 8601) | Sätts av servern |
| \`updated_at\` | string (ISO 8601) | Sätts av servern |

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
      "identity": null,
      "include_identity": false,
      "created_at": "2026-02-10T09:00:00Z",
      "updated_at": "2026-08-21T14:33:10Z"
    }
  ]
}
\`\`\`

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

### Tavla

\`GET /api/flux/projects/<id>/board/\` returnerar allt som behövs för att visa
ett projekts planering i ett enda svar:

\`\`\`json
{
  "project": { "id": 7, "name": "Renovering norra längan" },
  "projects": [],
  "milestones": [],
  "tasks": [],
  "updates": [],
  "documents": [],
  "users": [{ "id": 12, "username": "frida" }]
}
\`\`\`

\`projects\` är alla projekt du är medlem i, och \`users\` är de konton som
förekommer i projektet.

### Tidslinje

\`GET /api/flux/timeline/\` har samma form som tavlan men utan \`project\`, och
samlar milstolpar, uppgifter, uppdateringar och dokument från **alla** dina
projekt.

---

## Milstolpar

**Sökväg:** \`/api/flux/milestones/\`

| Fält | Typ | Beskrivning |
| --- | --- | --- |
| \`id\` | number | Sätts av servern |
| \`project\` | number | Projektets id. **Krävs** |
| \`title\` | string | Rubrik. **Krävs** |
| \`description\` | string | Fritext (Markdown) |
| \`status\` | string | \`not_started\`, \`in_progress\` eller \`done\` |
| \`target_date\` | string (datum) \\| null | Måldatum, \`YYYY-MM-DD\` |
| \`order\` | number | Ordning inom projektet |
| \`files\` | string[] | URL:er till bifogade filer |
| \`update_count\` | number | Antal uppdateringar (läses ut) |
| \`created_at\`, \`updated_at\` | string (ISO 8601) | Sätts av servern |

Filter: \`?project=<id>\`, \`?status=<status>\`.

---

## Uppgifter

En uppgift hör till ett projekt och kan ligga under en milstolpe, ha en
överordnad uppgift (deluppgifter) och kräva att andra uppgifter är klara först.

**Sökväg:** \`/api/flux/tasks/\`

| Fält | Typ | Beskrivning |
| --- | --- | --- |
| \`id\` | number | Sätts av servern |
| \`project\` | number | Projektets id. **Krävs** |
| \`milestone\` | number \\| null | Milstolpe |
| \`parent\` | number \\| null | Överordnad uppgift |
| \`requirements\` | number[] | Uppgifter som måste vara klara först |
| \`assignees\` | number[] | Konto-id för ansvariga |
| \`title\` | string | Rubrik. **Krävs** |
| \`description\` | string | Fritext (Markdown) |
| \`priority\` | string | \`low\`, \`medium\` eller \`high\` |
| \`status\` | string | \`not_started\`, \`in_progress\` eller \`done\` |
| \`due_date\` | string (datum) \\| null | Deadline, \`YYYY-MM-DD\` |
| \`recurrence\` | string | \`none\`, \`daily\`, \`weekly\`, \`monthly\` eller \`yearly\` |
| \`recurrence_interval\` | number | Var n:te dag/vecka/månad/år |
| \`recurrence_end_date\` | string (datum) \\| null | Sista datum för återkomsten |
| \`files\` | object[] | Bifogade filer |
| \`subtasks\` | number[] | Deluppgifter (läses ut) |
| \`required_by\` | number[] | Uppgifter som väntar på den här (läses ut) |
| \`recurrence_source\` | number \\| null | Uppgiften den här återkommer från (läses ut) |
| \`update_count\` | number | Antal uppdateringar (läses ut) |
| \`created_at\`, \`updated_at\` | string (ISO 8601) | Sätts av servern |

Filter: \`?project=\`, \`?milestone=\`, \`?parent=\`, \`?assignees=\`,
\`?priority=\`.

\`\`\`http
POST /api/flux/tasks/ HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token 9c8b7a6d5e4f3c2b1a09f8e7d6c5b4a3f2e1d0c9
Content-Type: application/json

{
  "project": 7,
  "milestone": 3,
  "parent": null,
  "requirements": [],
  "assignees": [12],
  "title": "Beställ takpannor",
  "description": "",
  "priority": "high",
  "status": "not_started",
  "due_date": "2026-11-01",
  "recurrence": "none",
  "recurrence_interval": 1,
  "recurrence_end_date": null,
  "files": []
}
\`\`\`

Ändra en uppgift med \`PATCH /api/flux/tasks/<id>/\`. Bara fälten du skickar
ändras; en skickad lista (t.ex. \`assignees\`) ersätter hela listan.

---

## Uppdateringar

Korta statusinlägg på ett projekt, eventuellt knutna till en milstolpe eller
uppgift.

**Sökväg:** \`/api/flux/updates/\`

| Fält | Typ | Beskrivning |
| --- | --- | --- |
| \`id\` | number | Sätts av servern |
| \`project\` | number | Projektets id. **Krävs** |
| \`milestone\` | number \\| null | Milstolpe |
| \`task\` | number \\| null | Uppgift |
| \`author\` | number \\| null | Författarens konto-id |
| \`content\` | string | Text (Markdown) |
| \`files\` | string[] | URL:er till bifogade filer |
| \`created_at\`, \`updated_at\` | string (ISO 8601) | Sätts av servern |

Filter: \`?project=\`, \`?milestone=\`, \`?task=\`.

---

## Dokument

**Sökväg:** \`/api/flux/documents/\`

| Fält | Typ | Beskrivning |
| --- | --- | --- |
| \`id\` | number | Sätts av servern |
| \`project\` | number | Projektets id. **Krävs** |
| \`milestone\` | number \\| null | Milstolpe |
| \`task\` | number \\| null | Uppgift |
| \`title\` | string | Rubrik |
| \`kind\` | string | \`markdown\`, \`flowchart\`, \`database_schema\` eller \`decision\` |
| \`content\` | string | Innehåll. Markdown, med Mermaid för diagram |
| \`created_at\`, \`updated_at\` | string (ISO 8601) | Sätts av servern |

Filter: \`?project=\`, \`?milestone=\`, \`?task=\`.

---

## Modell

Modellen hämtas i sin helhet med ett anrop:

\`\`\`http
GET /api/flux/projects/7/design/ HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token 9c8b7a6d5e4f3c2b1a09f8e7d6c5b4a3f2e1d0c9
Accept: application/json
\`\`\`

Svaret innehåller alltid alla nycklar, även när en samling är tom:

\`\`\`json
{
  "entities": [],
  "fields": [],
  "relations": [],
  "stack_profile": null,
  "resources": [],
  "api_operations": [],
  "api_operation_responses": [],
  "api_projections": [],
  "providers": [],
  "roles": [],
  "role_permissions": [],
  "screens": [],
  "integrations": [],
  "integration_operations": [],
  "seed_rows": []
}
\`\`\`

Varje del har också en egen resurs med \`GET\`, \`POST\`, \`PATCH\` och
\`DELETE\`. Filtrera på projekt med parametern i högerkolumnen.

| Resurs | Innehåll | Projektfilter |
| --- | --- | --- |
| \`/api/flux/entities/\` | Entiteter: \`name\`, \`description\` | \`?project=\` |
| \`/api/flux/fields/\` | Fält på en entitet: \`name\`, \`type\`, \`nullable\`, \`unique\`, \`default\`, \`max_length\`, \`order\` | \`?entity__project=\` |
| \`/api/flux/relations/\` | Relationer: \`source\`, \`target\`, \`kind\` (\`fk\`, \`m2m\`, \`o2o\`), \`on_delete\` | \`?source__project=\` |
| \`/api/flux/stack-profiles/\` | Stack: \`targets\`, \`api_naming\`, \`auth_method\`, \`database\`, \`app_label\`, \`namespace\`. Högst en per projekt | \`?project=\` |
| \`/api/flux/resources/\` | API-resurser: \`entity\`, \`path\`, \`title\`, \`description\` | \`?entity__project=\` |
| \`/api/flux/api-operations/\` | Operationer på en resurs: \`key\`, \`method\`, \`path\`, \`parameters\`, \`request_schema\`, \`pagination\` | |
| \`/api/flux/api-operation-responses/\` | Svar på en operation: \`status_code\`, \`description\`, \`projection\` | |
| \`/api/flux/api-projections/\` | Svarsformer som inte är en entitet: \`name\`, \`schema\` (JSON Schema), \`description\` | |
| \`/api/flux/providers/\` | Frontendens datagränser: \`name\`, \`description\`, \`resources\` | \`?project=\` |
| \`/api/flux/roles/\` | Roller: \`name\`, \`description\` | \`?project=\` |
| \`/api/flux/role-permissions/\` | Behörigheter: \`role\`, \`api_operation\`, \`scope\` (\`all\`, \`own\`, \`member\`) | \`?role__project=\` |
| \`/api/flux/screens/\` | Skärmar: \`name\`, \`route\`, \`description\`, \`entities\`, \`parent\` | \`?project=\` |
| \`/api/flux/integrations/\` | Externa API:er: bas-URL, autentisering, timeout, retries, cache | \`?project=\` |
| \`/api/flux/integration-operations/\` | Anrop mot en integration och hur svaret mappas till en entitet | |
| \`/api/flux/seed-rows/\` | Seed-data för en entitet: \`data\`, \`order\` | \`?entity__project=\` |

Fälttypen (\`type\`) är en av \`string\`, \`text\`, \`int\`, \`bigint\`,
\`decimal\`, \`float\`, \`bool\`, \`date\`, \`datetime\`, \`time\`, \`uuid\`,
\`json\`, \`email\` och \`url\`.

### Identiteter

\`/api/flux/identities/\` är dina visuella identiteter: varumärke, färger för
ljust och mörkt läge, typsnitt, typskala, avstånd, hörnradier, skuggor, logotyper
och tillgänglighetsnivå (\`AA\` eller \`AAA\`). En identitet ägs av ditt konto
och kan kopplas till flera projekt via projektets \`identity\`.

---

## Kodgenerering

### Förhandsvisa

\`\`\`http
GET /api/flux/projects/7/scaffold/?target=typescript HTTP/1.1
Host: origin.api.fåvitsko.se
Authorization: Token 9c8b7a6d5e4f3c2b1a09f8e7d6c5b4a3f2e1d0c9
Accept: application/json
\`\`\`

\`target\` är en av \`django\`, \`typescript\`, \`csharp\`, \`skeleton\`,
\`design\` och \`integration\`. Lägg till \`&files=a,b\` för att bara få vissa
filer. Svaret är de genererade filerna:

\`\`\`json
{
  "target": "typescript",
  "files": [
    { "path": "types.ts", "content": "…" }
  ]
}
\`\`\`

### Spara som dokument

\`POST /api/flux/projects/<id>/scaffold-document/\` med \`{ "target": "django" }\`
genererar koden och sparar den som ett dokument i projektet. Svaret är det
skapade dokumentet.

### Skapa uppgifter

\`POST /api/flux/projects/<id>/generate-tasks/\` skapar en uppgift per
leveransområde (datamodell, API-kontrakt, roller, gränssnitt, integrationer och
kvalitet). Anropet kan köras flera gånger utan att skapa dubbletter. Svaret är
\`{ "created": [...] }\` med de uppgifter som skapades.

---

## C#

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

// Skapa en uppgift i första projektet.
var draft = new NewTask(
    Project: projects[0].Id,
    Title: "Beställ takpannor",
    Priority: "high",
    Status: "not_started",
    DueDate: "2026-11-01");

var response = await http.PostAsJsonAsync("/api/flux/tasks/", draft);
response.EnsureSuccessStatusCode();
var created = await response.Content.ReadFromJsonAsync<FluxTask>();
Console.WriteLine($"Skapade uppgift #{created!.Id}");

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
    [property: JsonPropertyName("identity")] int? Identity,
    [property: JsonPropertyName("include_identity")] bool IncludeIdentity);

record NewTask(
    [property: JsonPropertyName("project")] int Project,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("priority")] string Priority,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("due_date")] string? DueDate);

record FluxTask(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("project")] int Project,
    [property: JsonPropertyName("milestone")] int? Milestone,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("status")] string Status);
\`\`\`
`

export default function FluxDocsPage() {
  return (
    <DocShell crumb="Dokumentation / Flux">
      <DocMarkdown content={DOC} />
    </DocShell>
  )
}
