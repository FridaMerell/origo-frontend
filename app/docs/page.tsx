import type { Metadata } from "next"
import { DocMarkdown } from "./doc-markdown"
import { DocShell } from "./doc-shell"

export const metadata: Metadata = {
  title: "Dokumentation — Origo",
  description:
    "Ingång till dokumentationen för Origos appar och till det externa API:t med token-autentisering.",
}

const DOC = `# Dokumentation

Origo är ett nav med en gemensam inloggning för flera fristående appar. Varje app
har sin egen dokumentation — börja där:

## Apparnas dokumentation

- [**Tempus**](/docs/tempus) — observationer, arter, krysslistor och rutter.
- [**Flux**](/docs/flux) — projekt, milstolpar, uppgifter och dokument.

---

## Externt API

Alla appar delar ett REST-API som du kan nå utifrån. Appsidorna ovan innehåller
kodexempel (\`http\` och C#) för respektive resurs. Det här avsnittet är det
gemensamma: bas-URL, autentisering och svarskonventioner.

### Token

Åtkomst sker med en **personlig API-token**. Du skapar och hanterar den i Origo
under [Konto → Anslutningar](/konto/anslutningar). Behandla den som ett lösenord —
den ger samma behörighet som ditt konto.

Sökvägarna nedan är relativa mot API-värden (\`https://origin.api.fåvitsko.se\`)
och **avslutas alltid med snedstreck**. Utan det avslutande \`/\` svarar servern \`301\` och klienten kan
tappa \`Authorization\`-headern i omdirigeringen.

### Autentisering

Skicka token i \`Authorization\`-headern med prefixet \`Token\`:

\`\`\`http
Authorization: Token 9c8b7a6d5e4f3c2b1a09f8e7d6c5b4a3f2e1d0c9
\`\`\`

Vid token-auth behövs varken cookies eller \`X-CSRFToken\`.

### Svarskonventioner

- \`Content-Type: application/json\` för alla \`POST\`- och \`PATCH\`-anrop.
- Tidsstämplar är ISO 8601 i UTC (\`2026-05-01T06:30:00Z\`).
- Geometri är GeoJSON med koordinater i ordningen \`[longitud, latitud]\` (WGS84).
- Listendpoints svarar med ett paginerat kuvert — följ \`next\` tills den är \`null\`:

\`\`\`json
{
  "count": 42,
  "next": "https://origin.api.fåvitsko.se/api/tempus/observations/?page=2",
  "previous": null,
  "results": []
}
\`\`\`

### Felkoder

| Status | Betydelse |
| --- | --- |
| \`400\` | Valideringsfel — svarskroppen har ett fält-för-fält-objekt med meddelanden |
| \`401\` | Token saknas eller är ogiltig |
| \`403\` | Autentiserad men saknar behörighet till resursen |
| \`404\` | Resursen finns inte, eller är dold för ditt konto |
| \`301\` | Avslutande snedstreck saknas i sökvägen |
`

export default function DocsPage() {
  return (
    <DocShell crumb="Origo / Dokumentation" backHref="/" backLabel="Tillbaka">
      <DocMarkdown content={DOC} />
    </DocShell>
  )
}
