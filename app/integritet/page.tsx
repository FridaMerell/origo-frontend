import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Integritet och cookies | Origo",
  description:
    "Vilka uppgifter Origo sparar, varför, vilka cookies som används och hur du kommer åt eller raderar dina uppgifter.",
};

const COOKIES: { name: string; purpose: string; lifetime: string }[] = [
  {
    name: "origo_sessionid, origo_csrftoken",
    purpose:
      "Håller dig inloggad och skyddar formulär mot förfalskade förfrågningar.",
    lifetime: "Upp till ett år",
  },
  {
    name: "sessionid, csrftoken",
    purpose:
      "Samma sak som ovan, men för anrop som webbläsaren skickar direkt till tjänstens API, till exempel livesändningen från BirdNET.",
    lifetime: "Upp till ett år",
  },
  {
    name: "verso_facility",
    purpose: "Minns vilken anläggning du valt i Verso.",
    lifetime: "Ett år",
  },
  {
    name: "verso_mode",
    purpose: "Minns om du valt ljust eller mörkt läge i Verso.",
    lifetime: "Ett år",
  },
  {
    name: "flux_project",
    purpose: "Minns vilket projekt du valt i Flux.",
    lifetime: "Ett år",
  },
  {
    name: "tempus_geo_area",
    purpose: "Minns vilket område du valt i Tempus.",
    lifetime: "Ett år",
  },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-[#E7E5DE]/90">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-4 text-lg leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#E7E5DE] px-5 py-6 text-[#1B252B] sm:px-10 sm:py-10">
      <div className="container mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em]">
            ORIGO / INTEGRITET
          </span>
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-[0.12em] underline underline-offset-4"
          >
            Till startsidan
          </Link>
        </header>

        <div className="mt-16 grid gap-12 lg:grid-cols-[2fr_3fr] lg:gap-24">
          <div className="lg:sticky lg:top-10 lg:self-start">
            <h1 className="text-5xl font-medium tracking-[-0.04em] sm:text-6xl">
              Integritet och cookies
            </h1>
            <p className="mt-6 text-xl leading-snug">
              Vad Origo sparar om dig, varför, och vad du kan göra åt det.
            </p>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[#58636A]">
              Uppdaterad 11 oktober 2026
            </p>
          </div>

          <div className="space-y-14">
            <Section title="Vem som ansvarar">
              <p>
                Origo drivs av Frida Merell, som är personuppgiftsansvarig för
                uppgifterna på den här webbplatsen. Du når mig på
                frida.merell@gmail.com.
              </p>
            </Section>

            <Section title="Vad som sparas">
              <p>
                Du behöver ett konto för det mesta på Origo. Då sparas
                användarnamn, lösenord och e-postadress, och namn om du fyller
                i det.
              </p>
              <p>
                Dessutom sparas det du själv lägger in i apparna: i Verso till
                exempel projekt, utgifter, uppdateringar, bilder, personer och
                händelser, i Flux projekt, uppgifter och dokument, i Tempus
                observationer, platser, rutter och checklistor, i Opus böcker,
                anteckningar, bokmärken och ordlistor, och i Apsis foton av
                kyrkor.
              </p>
              <p>
                Din position används bara när du själv trycker på knappen för
                aktuell plats, och webbläsaren frågar dig först. Aviseringar
                kräver att du själv godkänner dem i webbläsaren, och då sparas
                en prenumeration som används för att skicka dem.
              </p>
              <p>
                Som på alla webbplatser får servern din IP-adress och uppgifter
                om din webbläsare när du besöker sidorna.
              </p>
            </Section>

            <Section title="Varför, och på vilken grund">
              <p>
                Uppgifterna används för att Origo ska fungera: du ska kunna
                logga in, spara det du lägger in och se det igen. Det är den
                rättsliga grunden, att fullgöra tjänsten du har bett om.
                Uppgifterna används inte för reklam, profilering eller
                analys, och säljs inte vidare.
              </p>
            </Section>

            <Section title="Vem som kan se vad">
              <p>
                Det beror på appen. I Verso och Flux delas innehållet med
                medlemmarna i huset eller projektet. På Tempus startsida visas
                de senaste observationerna från alla användare för den som är
                inloggad. I Opus kan verk och ordlistor vara offentliga, och
                då syns de för andra än dig.
              </p>
            </Section>

            <Section title="Tjänster från andra">
              <p>
                Typsnitten på Origo hämtas från Origos egen server, inte från
                Google. Några delar hämtas däremot från Google, och då skickar
                din webbläsare uppgifter som din IP-adress direkt dit. Google
                har egna villkor för hur de används.
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  Kartor, platssökning och ruttplanering i Tempus använder
                  Google Maps, och då skickas även det du söker efter.
                </li>
                <li>
                  I Flux kan ett projekts identitet peka på typsnitt hos
                  Google Fonts. Då hämtas de därifrån när identiteten visas.
                </li>
              </ul>
            </Section>

            <Section title="Cookies">
              <p>
                Origo använder bara cookies som behövs för att tjänsten ska
                fungera eller för att komma ihåg dina val. Det finns ingen
                analys, ingen reklam och inga spårare från tredje part, och
                därför ingen cookiebanner att godkänna. Webbläsarens lokala
                lagring används på samma sätt, till exempel för ljust eller
                mörkt läge i Flux, Tempus, Opus och Apsis och för platser du
                använt i Tempus.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] border-collapse text-left text-base">
                  <thead>
                    <tr className="border-b border-[#1B252B]">
                      <th className="py-2 pr-4 font-mono text-[11px] font-medium uppercase tracking-[0.14em]">
                        Cookie
                      </th>
                      <th className="py-2 pr-4 font-mono text-[11px] font-medium uppercase tracking-[0.14em]">
                        Används till
                      </th>
                      <th className="py-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em]">
                        Livslängd
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {COOKIES.map(cookie => (
                      <tr
                        key={cookie.name}
                        className="border-b border-[#1B252B]/25 align-top"
                      >
                        <td className="py-3 pr-4 font-mono text-sm">
                          {cookie.name}
                        </td>
                        <td className="py-3 pr-4">{cookie.purpose}</td>
                        <td className="py-3">{cookie.lifetime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                Du kan radera cookies i webbläsaren när du vill. Då loggas du
                ut och Origo glömmer dina val.
              </p>
            </Section>

            <Section title="Hur länge uppgifterna sparas">
              <p>
                Uppgifterna sparas så länge du har ett konto. Vill du att
                kontot och dina uppgifter tas bort, skriv till mig.
              </p>
            </Section>

            <Section title="Dina rättigheter">
              <p>
                Du kan be om att få se vilka uppgifter som finns om dig, få
                felaktiga uppgifter rättade, få uppgifter raderade eller
                flyttade, och invända mot hur de används. Skriv till
                frida.merell@gmail.com, så svarar jag.
              </p>
              <p>
                Tycker du att uppgifterna hanteras fel kan du klaga hos
                Integritetsskyddsmyndigheten, imy.se.
              </p>
            </Section>
          </div>
        </div>

        <footer className="mt-24 border-t border-[#1B252B]/35 pt-8 font-mono text-[10px] uppercase leading-[1.8] tracking-[0.16em] text-[#58636A]">
          Byggs och underhålls sporadiskt av Frida Merell
          <br />
          Kontakt: frida.merell@gmail.com
        </footer>
      </div>
    </main>
  );
}
