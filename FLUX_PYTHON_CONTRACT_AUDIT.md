# Flux: Python-kontraktsgranskning för frontend

> Status: läst mot `C:\projects\project_management` den 2026-09-26. Detta är underlaget för nästa ombyggnad av `/model`. Ingen punkt här är en gissning om frontend; modeller, serializers, views och `FRONTEND_HANDOFF.md` är källan.

## Läsordning och auktoritativa källor

1. `FRONTEND_HANDOFF.md` — kontraktet för den samlade designgrafen.
2. `flux/models/*.py` — persistenta objekt och relationer.
3. `flux/serializers/*.py` — faktiska läs- och skrivfält samt validering.
4. `flux/views/*.py` och `flux/urls.py` — tillgängliga routes, metoder och särskilda actions.
5. `flux/services/scaffold/*`, `flux/services/planning.py`, `flux/tasks.py`, `flux/signals.py` och `flux/codex_plans.py` — generatorer, planering, bakgrundsarbete och den privata Codex-ytan.

## Huvudregel för modell-UI

`GET /api/flux/projects/:projectId/design/` är den enda auktoritativa hämtningen för designredovisning. Den ska laddas en gång och ID:n ska behållas oförändrade. Frontend ska göra uppslag lokalt; den får inte hämta kompletterande designlistor enbart för att bygga summeringar eller relationer.

Den returnerar:

- `entities`, `fields`, `relations`, `stack_profile`
- `resources`, `api_operations`, `api_projections`, `api_operation_responses`
- `providers`, `roles`, `role_permissions`, `screens`
- `integrations`, `integration_operations`, `seed_rows`

Den returnerar **inte** projektets tasks, milestones, documents, updates, tags eller identity. De är separata Flux-ytor och får inte fejkas som delar av designaggregatet.

## Obligatoriska ID-kopplingar

| Källa | Nyckel | Mål | Betydelse i UI |
| --- | --- | --- | --- |
| Field | `entity` | Entity | Fältet tillhör entiteten. |
| Relation | `source`, `target` | Entity | Domänkopplingens riktning och mål. |
| Resource | `entity` | Entity | API-ytan för entiteten. |
| ApiOperation | `resource` | Resource | Den enda endpoint-definitionen. |
| ApiOperationResponse | `operation`, `projection` | ApiOperation, ApiProjection | Dokumenterat statusresultat och eventuellt svarsschema. |
| Provider | `resources[]` | Resource | Frontendens datagräns; entiteter härleds via resurser. |
| RolePermission | `role`, `api_operation` | Role, ApiOperation | Operationens access-scope. |
| Screen | `parent`, `entities[]` | Screen, Entity | Navigationshierarki och relevanta domänobjekt. |
| IntegrationOperation | `integration`, `entity` | Integration, Entity | Externt flöde och dess lokala mål. |
| SeedRow | `entity` | Entity | Seeddata för den valda entiteten. |

## Designobjekt: faktiska serialiserade fält

### Domänmodell

- **Entity**: `id`, `project`, `name`, `description`, `created_at`, `updated_at`.
  `name` är unikt per projekt.
- **Field**: `id`, `entity`, `name`, `type`, `description`, `nullable`, `unique`, `default`, `max_length`, `order`.
  Tillåtna typer: `string`, `text`, `int`, `bigint`, `decimal`, `float`, `bool`, `date`, `datetime`, `time`, `uuid`, `json`, `email`, `url`. Fältnamn får inte kollidera med en relation på samma entitet.
- **Relation**: `id`, `source`, `target`, `kind`, `name`, `related_name`, `on_delete`, `nullable`, `description`.
  `kind`: `fk`, `m2m`, `o2o`; `on_delete`: `cascade`, `protect`, `set_null`. Källa och mål måste ligga i samma projekt och ett relationsnamn får inte kollidera med ett fält på källan.

### API-kontrakt

- **Resource**: `id`, `entity`, `path`, samt skrivskyddade `title` och `description`.
  Det finns exakt en Resource per Entity. `title` beräknas från path och `description` är för närvarande tom; frontend får inte presentera dem som redigerbara lagrade fält.
- **ApiOperation**: `id`, `resource`, `key`, `method`, `path`, `title`, `description`, `parameters`, `request_schema`, `pagination`.
  `key`: `list`, `retrieve`, `create`, `update`, `delete`, `custom`. Detta är den enda endpoint-definitionen.
- **ApiProjection**: `id`, `project`, `name`, `description`, `schema`.
  En återanvändbar svarstyp, inte en endpoint och inte automatiskt identisk med Entity. `schema` måste vara ett objekt.
- **ApiOperationResponse**: `id`, `operation`, `status_code`, `description`, `projection`.
  `projection` är nullable: null betyder bodyless response. Projektionen måste tillhöra operationens projekt.

### Frontenddesign och access

- **Provider**: `id`, `project`, `name`, `description`, `resources`.
  En provider måste ha minst en Resource och samtliga resurser måste tillhöra projektet. Modellens äldre `entities`-fält är uttryckligen legacy och exponeras inte av serializern; UI ska använda `resources` och härleda entitetsscope därifrån.
- **Role**: `id`, `project`, `name`, `description`.
- **RolePermission**: `id`, `role`, `api_operation`, `scope`, där `scope` är `all`, `own` eller `member`. En API-operation krävs och måste tillhöra samma projekt som rollen.
- **Screen**: `id`, `project`, `name`, `route`, `description`, `entities`, `parent`.
  Parent och alla entiteter måste höra till samma projekt. En skärm kan inte vara sin egen parent.

### Integration och leveransdata

- **Integration**: `id`, `project`, `name`, `kind`, `description`, `env_vars`, `base_url`, `auth_type`, `auth_name`, `auth_env_var`, `auth_secret_env_var`, `oauth_token_url`, `timeout_seconds`, `retries`, `rate_limit_per_minute`, `cache_ttl_seconds`.
  `kind`: `api`, `auth`, `storage`, `email`, `payment`, `other`. `auth_type`: `none`, `api_key_header`, `api_key_query`, `bearer`, `basic`, `oauth_client`. Timeout är 1–120 sekunder och retries högst 5.
- **IntegrationOperation**: `id`, `integration`, `description`, `name`, `method`, `path`, `body_format`, `params`, `items_path`, `pagination`, `pagination_config`, `filters`, `key_field`, `mappings`, `sync`, `sync_interval_minutes`, `cache_ttl_seconds`, `sample_response`, `entity`.
  `method`: GET/POST/PUT/PATCH/DELETE; `body_format`: json/form; `pagination`: none/offset/page/cursor. Målentiteten måste tillhöra integrationens projekt. `params`, `filters`, `mappings`, paginationkonfiguration och exempelrespons är verkliga delar av kontraktet och ska få särskilda dokumentations- och editorytor.
- **SeedRow**: `id`, `entity`, `data`, `order`. `data` måste vara ett objekt och får bara innehålla kända fältnamn från entiteten.
- **StackProfile**: `id`, `project`, `targets`, `api_naming`, `auth_method`, `database`, `app_label`, `namespace`.
  En per projekt. Targets är endast `django`, `typescript`, `csharp`; namngivning är `snake_case` eller `camel_case`; auth är `session`, `token`, `jwt` eller `none`; databas är `postgresql`, `mysql`, `sqlite` eller `sqlserver`.

## Allmänna Flux-ytor utanför designaggregatet

| Område | Objekt och central relation | View / route |
| --- | --- | --- |
| Projekt | Project: members, files, tags, include_identity, identity | `ProjectViewSet` `/api/flux/projects/` |
| Milstolpar | Milestone → project, tags, files, status, target_date | `MilestoneViewSet` `/api/flux/milestones/` |
| Uppgifter | Task → project, milestone, parent, requirements, assignees, recurrence, files, priority, status | `TaskViewSet` `/api/flux/tasks/` |
| Uppdateringar | Update → project, optional milestone/task, author, files | `UpdateViewSet` `/api/flux/updates/` |
| Dokument | Document → project, optional milestone/task, author; markdown/flowchart/database_schema/decision | `DocumentViewSet` `/api/flux/documents/` |
| Taggar | Tag → creator; kopplas till projekt och milstolpar | `TagViewSet` `/api/flux/tags/` |
| Identitet | VisualProfile: färger, typography, spacing, assets och guidelines | `VisualProfileViewSet` `/api/flux/identities/` |
| Tidslinje | Samlad projects/milestones/tasks/updates/documents/users | `TimelineView` `/api/flux/timeline/` |

Task saknar idag en strukturerad FK till Entity, Field, Resource eller ApiOperation. Dokument och updates kan länkas till task/milestone, men designaggregatet innehåller inte tasks. Ett gränssnitt får därför inte visa påhittade task→fält-kopplingar. Den relationen behöver först läggas till och serialiseras i Python om den ska bli ett verkligt krav.

## Projekt-actions och metoder

| Route | Metod | Faktiskt svar / beteende |
| --- | --- | --- |
| `/api/flux/projects/:id/board/` | GET | Projektets board: project, projects, milestones, tasks, updates, documents, users. |
| `/api/flux/projects/:id/design/` | GET | Den kompletta ID-bevarande designgrafen. |
| `/api/flux/projects/:id/scaffold/?target=` | GET | `{ target, files }` från `generate_files(build_spec(project), target)`. |
| `/api/flux/projects/:id/scaffold-document/` | POST | Tar `target`, genererar filer och sparar/uppdaterar ett Markdown Document med koden. |
| `/api/flux/projects/:id/generate-tasks/` | POST | Skapar uppgifter från designen och returnerar skapade id/title/milestone. |

Viktigt: scaffold-document är **POST**, inte GET. Scaffold är själva kod-bootstrappingsektionen och måste visas som ett eget förstaklassigt område, med target-val, genererade filer och dokumentresultat.

## Slutförd scaffold- och implementationskartläggning

`build_spec(project)` översätter den sparade modellen till generatorernas rena spec: projekt, valfri identity, stack, entities med fält/relationer, resurser, API-operationer med svar, API-projektioner, providers, roller, skärmar, integrationer med operationer och seeds. Det är samma design som ska kunna förstås från model-UI:t.

`generate_files(spec, target)` accepterar följande faktiska targets:

| Target | Genererat underlag | Vad UI:t ska förklara och visa |
| --- | --- | --- |
| `django` | app, modeller, serializers, viewsets, router-URL:er, permissions, fixtures och `API_PROJECTIONS.md` | Domänfält/relationer, Resource-operationer, roller, seeddata och projektioner som genererad Python-kod. |
| `typescript` | `types.ts`, `api.ts`, `api-projections.ts`, Resource-baserade provider-komponenter och `routes.ts` | Typer, API-klient, provider-gränser och skärmnavigering. |
| `csharp` | entity-klasser, `AppDbContext`, controllers och `API_PROJECTIONS.md` | EF Core-relationer, controllers och auth-betingat API. |
| `design` | `app/globals.css`, identity CSS-filer, Tailwind-tema, tokens, style guide och assetmanifest | Identityns faktiska tokens, mörkt/ljust läge, typografi, WCAG-kontrast, assets och byggregler. Kräver vald identity. |
| `integration` | HTTP-klienter, field mappers, syncmoduler, management commands, scheduled tasks, tester, fixtureexempel och integrationsdokumentation | Externa operationer, auth, parametrar, pagination, filter, mapping, cache, sync och verkliga sample responses. Kräver minst en integrationsoperation. |
| `skeleton` | README, `.env.example`, `.gitignore`, compose, CI, Dockerfile och projektkonfiguration | Vald stack, databas, auth, integrationens miljövariabler, driftsättning och CI. |

### Scaffold-regler som måste synas i UI

- Stackprofilens `targets` accepterar enbart `django`, `typescript`, `csharp`; scaffold-motorn har dessutom de fristående targets `design`, `integration` och `skeleton`.
- `design` misslyckas utan aktiverad projektidentity. Det är ett krav från generatorn, inte en frontenddetalj.
- `integration` misslyckas om ingen integration har operationer. Varje integration behöver dessutom `base_url` för kodgenerering.
- Integration mapping kräver vald lokal Entity och en verklig `sample_response`. Mappingvägar och filter valideras mot samplet före lagring; sync kräver mappingar och `key_field`.
- En sync med intervall genererar både en `django_tasks`-uppgift som återköar sig och ett manuellt management command.
- `scaffold` svarar med filobjekt (`path`, `content`). Det är underlaget för filträd, kodförhandsvisning och kopiering/export i frontend.
- `scaffold-document` sparar samma genererade innehåll i ett Flux `Document` med titeln `Scaffold: {target}`. UI:t ska visa dokumentresultatet och dess koppling till projektet.

### Identitetens generator-kontrakt

VisualProfile är mer än färger. Generatorn producerar design tokens och styleguide från `colors`, tema-lägen, fonts, scale, spacing, radii, shadows, assets, logo rules, icon library, accessibility target och guidelines. Valideringen kräver bland annat giltiga `#RRGGBB`-värden, säkra font- och URL-värden, begränsade tokennamn och WCAG-kontrastkontroller. Identity-sidan och scaffold-sidan ska därför länka till varandra; model-UI:t får inte reducera identity till en flagga.

### Automatisk task-planering och verkliga taskrelationer

`POST /api/flux/projects/:id/generate-tasks/` bygger en idempotent starter-backlog från den befintliga designen: Datamodell, API, Behörigheter, Gränssnitt, Integrationer och Kvalitet när respektive designunderlag finns. Varje skapad task länkas till en genererad Milestone, men inte till ett enskilt fält, en specifik Resource eller en ApiOperation.

Återkommande Tasks skapar nästa förekomst när en task går till `done`; deadline-notifieringar skapas för öppna tasks som förfaller idag. Task-UI måste därför bevara recurrence, interval, end date, dependencies, parent/subtasks, assignees, files, priority och status — de är alla riktiga Python-egenskaper.

### Privat Codex-yta

`/api/flux/codex/...` är ett separat tokenautentiserat API med idempotency keys. Det erbjuder privata planimporter, plan-append, läsning, scaffold, statusuppdateringar och begränsade designmutationer. Det är inte den sessionautentiserade användar-frontendens CRUD-yta och ska inte återanvändas av `/model` utan ett uttryckligt produktbeslut.

## Routerinventering

`DefaultRouter` exponerar CRUD för följande samlingar:

`projects`, `milestones`, `tags`, `documents`, `entities`, `fields`, `relations`, `stack-profiles`, `resources`, `api-projections`, `api-operations`, `api-operation-responses`, `providers`, `roles`, `role-permissions`, `screens`, `integrations`, `integration-operations`, `seed-rows`, `identities`, `tasks`, `updates`.

Det finns dessutom tokenbaserade `/api/flux/codex/...`-views för privata Codex-projekt: plan-import och append, läsning, scaffold, task/milestone-status, dokumentuppdatering, entity/field/resource/role/relation samt API-projection/API-operation/API-response/provider. De ska **inte** blandas ihop med den vanliga sessionbaserade frontendens CRUD utan ett uttryckligt produktbeslut.

## Konsekvenser för ny informationsarkitektur

1. Bygg inte en SPA-flikvy. Modellinnehåll ska delas i navigerbara serversidor med tydliga URL:er och återlänkar till indexet.
2. `/model` ska vara ett kompakt index: designstatus, domänkarta, API-yta, frontenddesign, integrationer och scaffold som ingångar — inte en renderad full dump.
3. Varje område ska ha sin egen läs- och hanteringsvy, med sakliga create/edit-formulär baserade på serializerns riktiga fält och valideringsregler.
4. API-sidan ska alltid visa Resource → ApiOperation → alla ApiOperationResponse → optional ApiProjection; den får inte härleda svar från Entity.
5. Provider-sidan ska använda den nya Resource-baserade Provider-modellen och visa härledd entitetstäckning.
6. Scaffold-sidan ska konsumera `scaffold` och `scaffold-document` som kod/fil-resultat, inte endast återge stackprofilens metadata.
7. Uppgiftskopplingar får endast visualiseras genom faktiska nuvarande relationer (task↔milestone, task↔documents, task↔updates, dependencies). Strukturerad task↔design-koppling kräver backendfält först.

## Genomförd API Workbench

Den godkända API-ytan är genomförd som separata navigerbara serversidor, inte som en SPA:

- `/model/api` visar domän→Resource-kartan, Provider→Resource-kopplingen, projektioner och skapa-ingångar.
- `/model/api/resources/[resourceId]` visar resursens entitet/fält, operationer, create/edit-länkar och relevanta scaffold-filer.
- `/model/api/operations/[operationId]` visar request-kontrakt, alla responses, projektioner, behörighet, Provider och berörda Screens samt create/edit-länkar för svar.
- `/model/api/projections/[projectionId]` visar svarsschema, användande responses och edit-länk.
- `/model/scaffold` är den fullständiga kodgeneratorn för `django`, `typescript`, `csharp`, `design`, `integration` och `skeleton`: target-val, filträd, faktisk kod, kopiera, lokal nedladdning och ett explicit val att skapa Flux-dokumentet.

Resource, ApiOperation, ApiOperationResponse och ApiProjection har dedikerade create/edit-formulär. De använder exakt serializerns skrivbara fält: Resource exponerar endast `entity` och `path`; Response tillåter en nullable projection; JSON-kontrakten för operation och projektion finns i sina namngivna, avgränsade fält.

## Beslut som fortfarande kräver backend eller produktval

- Om uppgifter ska knytas direkt till fält, resurser eller operationer behövs först en auktoritativ backendrelation (M2M eller en generisk designreferens). Nuvarande Python-kontrakt har ingen sådan koppling.

## Implementerad model-UI

**/model** är nu ett index till riktiga routes för domän, API, frontend, integrationer, leverans och scaffold. Samtliga läsvyer använder ID-baserade internlänkar mellan de relationer som finns i designgrafen.

- **Domän** har create/edit för Entity, Field och Relation, med serializerns enumvärden och projekttillhöriga uppslag.
- **API Workbench** har create/edit för Resource, ApiOperation, ApiOperationResponse och ApiProjection. API-kontraktens nästlade värden byggs i en visuell JSON-trädeditor, inte i en rå JSON-textyta.
- **Frontend** har create/edit för Screen, Role och RolePermission samt en interaktiv Provider-generator. Generatorn väljer Resources, härleder Entity-scope, visar den TypeScript-kod som Python-generatorn producerar och sparar samma Provider-konfiguration.
- **Integrationer** och **SeedRow** har visuella trädeditors för alla serialiserade nästlade kontrakt. Läsvyer visar dessa som fältvägar och värden, inte som JSON-dumpar.
- **Leverans** har create/edit för StackProfile och SeedRow samt internlänkar till generatorn. **/model/scaffold** visar faktiska scaffold-filer per target.

JSON finns alltså kvar som datakapacitet i modellen, men användaren behöver inte skriva JSON för att skapa eller ändra nästlade värden.
