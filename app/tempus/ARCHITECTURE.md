# Tempus – serverstruktur

Det här dokumentet beskriver hur Tempus serverlogik är organiserad och var ny
kod ska placeras. Målet är att det ska gå att hitta från en vy till rätt action
och vidare till datahämtningen utan att känna till hela applikationen.

## Översikt

```text
page.tsx eller klientkomponent
        │
        ▼
app/tempus/_actions/<funktionsområde>.ts
        │
        ├── validerar indata och session
        ├── utför mutation via Origo API
        └── invaliderar berörda sidor
        │
        ▼
app/tempus/_data/<funktionsområde>.ts
        │
        ▼
app/lib/dal/tempus/<funktionsområde>.ts
        │
        ▼
Origo API
```

Mappar som börjar med `_` är privata Next.js-mappar och blir därför inte egna
URL-segment.

## Server actions

Alla Tempus-specifika server actions ligger i `app/tempus/_actions/` och är
indelade efter produktens funktionsområden.

| Fil | Ansvar |
| --- | --- |
| `checklists.ts` | Skapa, ändra, ta bort och läsa registreringssidor för checklistor. |
| `observations.ts` | Skapa enstaka eller flera observationer samt ändra och ta bort dem. |
| `geo-areas.ts` | Validera och skapa geografiska områden. |
| `species.ts` | Arter, taxonsökning, artkategorier, import och följda arter. |
| `routes.ts` | Rutter, stopp och beräkning av föreslagna stopp. |
| `request.ts` | Interna hjälpare för autentiserade JSON-anrop och säkra felmeddelanden. |

Komponenter ska importera direkt från rätt områdesfil:

```ts
import { createObservation } from "@/app/tempus/_actions/observations"
```

Skapa inte en gemensam barrel-export för alla actions. Direkta importer gör
ägarskap, beroenden och sökresultat tydligare.

### Ansvar i en action

En action ska i normalfallet göra följande i ordning:

1. Validera indata med områdets schema.
2. Kontrollera att användaren är inloggad när operationen kräver det.
3. Bygga autentiserade headers med hjälparen i `request.ts` när det passar.
4. Anropa Origo API via `fetchOrigoApi` och en endpoint från `TEMPUS_ENDPOINTS`.
5. Översätta API-fel till ett användbart men säkert felmeddelande.
6. Invalidera endast de sidor vars serverdata har ändrats.
7. Returnera ett typat resultat till anroparen.

Actions ska inte innehålla presentationslogik eller lokalt UI-tillstånd.

## Dataåtkomst

`app/tempus/_data/` ger områdesvisa ingångar till Tempus datafunktioner och
typer. Actions importerar från dessa filer i stället för från det breda
DAL-indexet.

| Fil | Exempel på innehåll |
| --- | --- |
| `checklists.ts` | Checklistposter och paginerade registreringsrader. |
| `species.ts` | Artlistor, artdetaljer, fenogram och artrelaterade typer. |
| `routes.ts` | Ruttstopp och typer för föreslagna stopp. |

Den faktiska implementationen ligger numera under `app/lib/dal/tempus/`,
uppdelad per funktionsområde (`species.ts`, `checklists.ts`,
`observations.ts`, `routes.ts`, `geo.ts`, samt `shared.ts` för de generiska
pagineringshjälparna). `_data`-filerna importerar direkt från respektive
områdesfil där, till exempel `@/app/lib/dal/tempus/species`. Om en
DAL-fil flyttas eller delas upp ytterligare ska den publika importvägen i
`_data` behållas, så att anropande actions och vyer inte behöver känna till
den interna flytten.

Gemensamma funktioner som inte tillhör Tempus, exempelvis `getCurrentUser`,
importeras fortsatt från det gemensamma DAL-lagret (`@/app/lib/dal`).

De generiska pagineringshjälparna i `app/lib/dal/tempus/shared.ts`
(`TempusPage`, `fetchTempusPage`, `paginationQuery`) är i sin tur bara alias
för `app/lib/dal/pagination.ts` — den produktoberoende varianten som även
andra produkter kan använda för paginerade listor. Se
`app/lib/README.md`.

## Lägga till serverfunktionalitet

Utgå från vilket funktionsområde beteendet tillhör:

- Lägg en ny mutation i motsvarande fil under `_actions/`.
- Lägg en ny läsfunktion eller typ bakom motsvarande fil under `_data/`.
- Skapa en ny områdesfil endast när funktionen har ett tydligt eget ansvar.
- Importera actionen direkt i den komponent som använder den.
- Använd befintliga scheman och API-hjälpare; duplicera inte session- eller
  felhantering.

Om en funktion behöver kod från flera områden ska orkestreringen ligga i det
område som äger användarflödet. De andra områdena ska exponera små, tydliga
funktioner i stället för att UI-komponenten själv samordnar flera API-anrop.

## Namngivning

- Filer och interna symboler namnges på engelska.
- Funktionsnamn börjar med ett verb, exempelvis `createRouteStop` eller
  `loadSpeciesPage`.
- Resultattyper beskriver operationen, exempelvis `ObservationResult`.
- Formulärvärden valideras med schemat för samma område innan ett API-anrop.
- Serverfiler som exporteras till klientkomponenter börjar med `"use server"`.

## Kontroll efter ändringar

Kontrollera minst följande efter en ändring i serverstrukturen:

1. Det finns inga importer från den borttagna `app/actions/tempus.ts`.
2. Den berörda komponenten importerar från rätt funktionsområde.
3. Actionens indata och resultat är typade.
4. Fel från API:t returneras till anroparen och råa serversvar exponeras inte.
5. Berörda filer passerar lint och projektets typkontroll, bortsett från redan
   kända fel som inte hör till ändringen.
