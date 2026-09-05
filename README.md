# Origo frontend

Origo är en gemensam ingång till flera fristående appar. Frontenden är byggd
med Next.js och använder ett gemensamt Origo API för sessioner och produktdata.

## Appar

- **Verso** – fastighetsnav för besök, projekt, ekonomi och dokument.
- **Flux** – projekthantering med milstolpar, uppgifter, uppdateringar och dokument.
- **Tempus** – arter, observationer, krysslistor, rutter och BirdNET-detektioner.
- **Apsis** – en bildsamling av kyrkoabsider.

På en Origo-domän öppnas respektive app på sin subdomän, till exempel
`tempus.<domän>`. Samma session delas mellan apparna när cookie-domänen är
konfigurerad för den gemensamma huvuddomänen.

## Kodkarta

- `app/verso/`, `app/flux/`, `app/tempus/`, `app/apsis/` – produktområden,
  med egna layouter, startsidor och vyer.
- `app/konto/`, `app/login/`, `app/join/` – konto, inloggning och inbjudningar.
- `app/docs/` – användar- och API-dokumentation för Origo.
- `app/actions/` – server actions för autentisering och produktdata.
- `app/lib/` – API-klient, session/DAL, tenant- och delad klientlogik.
- `app/components/` – produktoberoende komponenter och formmönster.
- `app/styles/tokens/` – gemensamma design-tokens.
- `app/api/` – frontendens route handlers för filuppladdning, filer och väder.
- `proxy.ts` – väljer produkt från värdnamnet, skyddar privata sidor och skriver
  om förfrågningar till rätt produktväg.

### Namnkonventioner

- `page.tsx` är en tunn route-ingång som hämtar siddata och renderar huvudvyn.
- `home-view.tsx` är respektive produkts startsidesvy.
- Produktens server actions ligger i dess privata `_actions/`-mapp och delas per
  funktionsområde, exempelvis `checklists.ts`, `observations.ts` och `routes.ts`.
- Gemensamma interna action-hjälpare ligger i en namngiven hjälpfil i samma mapp;
  komponenter importerar alltid direkt från funktionsområdets fil.
- Övriga vyer namnges efter funktion och roll, exempelvis `tasks-view.tsx`,
  `task-form-drawer.tsx` och `task-panel.tsx`.
- URL-mappar kan vara svenska, medan interna filer, komponenter och typer namnges
  på engelska.

## Lokal konfiguration

Kopiera `.env.example` till `.env` och fyll i de värden som behövs i din miljö.
Standardvärden för lokal utveckling finns i `app/lib/config.ts`.

| Variabel | Användning |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Krävs för filuppladdning och filhämtning via Vercel Blob. |
| `ORIGO_API_URL` | Serverns bas-URL till Origo API. |
| `NEXT_PUBLIC_ORIGO_API_URL` | API-bas-URL i webbläsaren; används för BirdNET:s direkta SSE-ström. |
| `ORIGO_COOKIE_DOMAIN` | Delad cookie-domän för Origos subdomäner. |
| `NEXT_PUBLIC_ORIGO_VERSION` | Versionssträng som visas i produktgränssnitten. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps-nyckel för Tempus ruttplanerare. Begränsa den till tillåtna HTTP-referrers. |

Publika `NEXT_PUBLIC_*`-värden bäddas in vid bygge. Ändringar i dem kräver därför
ett nytt bygge.

## Kontroller

Tillgängliga kvalitetskontroller:

```bash
npm run lint
npm test
npm run test:forms
```

`test:forms` kör schema-, submit- och filuppladdningskontrakt för formulär.

## Mer dokumentation

- [Dokumentation i Origo](/docs) – produktöversikt och gemensamma API-regler.
- [Tempus API](/docs/tempus) – observationer.
- [Flux API](/docs/flux) – projekt.
- `app/tempus/ARCHITECTURE.md` – Tempus serverstruktur och riktlinjer för nya actions.
- `app/components/form/README.md` – mönster för formulär och server actions.
- `app/tempus/DESIGN.md` – Tempus designriktlinjer.
- `app/tempus/ui/biotope-map/README.md` – den fristående biotopskartan.
