"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { useApsisPosts } from "./_state/apsis-context";
import { ApseDrawing } from "./ui/ApseDrawing";
import { Sign, SignSources, SourceRefs, signBodyClass, signHeadingClass, signPanelClass, signPrintClass, signTextClass, type SignSource } from "./ui/Sign";
import { fileProxyUrl } from "@/app/lib/files";
import type { ApsisPlace, ApsisPost } from "@/app/lib/dal";

const INITIAL_POSTS = 6;
const POSTS_PER_LOAD = 6;

// The sign's sources, under the numbers the text refers to them by. Every
// statement of fact on the sign carries the number of the source it was
// checked against, and says no more than that source does.
const SOURCES: SignSource[] = [
  { number: 1, label: "Svenska kyrkan, “Vad är vad i kyrkan?”", href: "https://www.svenskakyrkan.se/vad-ar-vad-i-kyrkan" },
  { number: 2, label: "The Metropolitan Museum of Art, “Apse from San Martín at Fuentidueña”.", href: "https://www.metmuseum.org/art/collection/search/472507" },
  { number: 3, label: "Härnösands stift, “Hackås medeltida kyrka”.", href: "https://www.svenskakyrkan.se/harnosandsstift/hackas-medeltida-kyrka" },
  { number: 4, label: "Wikipedia, “Absid”.", href: "https://sv.wikipedia.org/wiki/Absid" },
  { number: 5, label: "Wikipedia, “Basilica”.", href: "https://en.wikipedia.org/wiki/Basilica" },
  { number: 6, label: "Wikipedia, “Apse”.", href: "https://en.wikipedia.org/wiki/Apse" },
  { number: 7, label: "Wikipedia, “Romansk arkitektur”.", href: "https://sv.wikipedia.org/wiki/Romansk_arkitektur" },
  { number: 8, label: "Svenska kyrkan, Allerums pastorat, “Fleninge kyrka – historia”.", href: "https://www.svenskakyrkan.se/allerum/fleninge-kyrka-historia_2" },
  { number: 9, label: "Svenska kyrkan, Vä-Skepparslövs församling, “Kormålningar i Vä kyrka”.", href: "https://www.svenskakyrkan.se/va-skepparslov/kormalningar-i-va-kyrka" },
  { number: 10, label: "Svenska kyrkan, Falköpings pastorat, “Medeltida målningar i Marka kyrka”.", href: "https://www.svenskakyrkan.se/falkoping/medeltida-malningar-i-marka-kyrka" },
  { number: 11, label: "Svenska kyrkan, Uppsala pastorat, “Besök Vaksala kyrka och kyrkby”.", href: "https://www.svenskakyrkan.se/uppsala/besok-vaksala-kyrka-och-kyrkby" },
  { number: 12, label: "Wikipedia, “Hackås kyrka”.", href: "https://sv.wikipedia.org/wiki/Hack%C3%A5s_kyrka" },
  { number: 13, label: "Wikipedia, “Lunds domkyrka”.", href: "https://sv.wikipedia.org/wiki/Lunds_domkyrka" },
];
// The source of what a church's panel says about the church itself.
const CHURCH_SOURCE: SignSource = { number: 14, label: "Svenska kyrkan, uppgifter om respektive kyrka.", href: "https://www.svenskakyrkan.se" };

const INGRESS: [string, number[]] = [
  "En absid är den välvda, halvrunda eller mångkantiga avslutningen av ett kyrkokor, ofta bakom altaret. Formen är äldre än de kristna kyrkorna och fanns redan i grekisk och romersk arkitektur.",
  [1],
];

// The sign's text about apses, as topics. Each one stands under its own
// heading, the way a panel on an information sign does, so a reader can find
// a part without reading the whole.
//
// A paragraph names the sources it was checked against. The only paragraph
// without one is the sign's own opinion, which is not a statement of fact.
const TOPICS: Array<{ title: string; paragraphs: Array<[text: string, sources: number[]]> }> = [
  {
    title: "Ordet och ursprunget",
    paragraphs: [
      ["Ordet absid kommer av grekiskans apsis, som betyder rundning eller båge, och har gått vidare genom latinets absis.", [4, 6]],
      ["I grekisk och romersk arkitektur var absiden oftast en anspråkslös nisch. I de romerska basilikorna, där domstolar hölls och andra offentliga ärenden sköttes, rymde absiden vanligen den upphöjda plats där ämbetsmännen satt.", [4, 5]],
      ["Under senantiken byggdes kyrkor efter basilikans plan. I den fornkristna kyrkan hade biskopen sin hedersplats vid absiden, där hans stol, cathedra, stod med altaret framför.", [5, 4]],
    ],
  },
  {
    title: "Absider i Sverige",
    paragraphs: [
      ["I Sverige började absider byggas under tidig medeltid. I Hackås kyrka i Jämtland hör den halvrunda absiden till kyrkans äldsta delar och har bevarade målningar från 1200-talet.", [3]],
      ["En romansk kyrka från 1100-talet kunde, som Fleninge kyrka i Skåne, bestå av långhus, kor och absid.", [8]],
      ["Hackås kyrka är den enda i Jämtland som har en halvrund absid.", [12]],
    ],
  },
  {
    title: "Den romanska absiden",
    paragraphs: [
      ["I romanska kyrkor är absiden ofta liten, med tjocka murar, små rundbågiga fönster och ett halvt kupolvalv. Där samlas ljus, bild och liturgi i kyrkorummets avslutning.", [2]],
      ["Runda bågar, små fönster och tjocka murar är vanliga i romanska absider. Murarna bär valvet, medan fönstren släpper in ljus över altaret.", [2]],
      ["Romansk arkitektur känns igen på kraftiga murar, som skulle klara valvens tryck. Fönster och dörrar gjordes små för att inte försvaga väggarna.", [7]],
      ["I Fleninge kyrkas absid finns ett av de små, högt sittande rundbågiga fönstren från 1100-talet kvar.", [8]],
    ],
  },
  {
    title: "Rund eller mångkantig",
    paragraphs: [
      ["En absid behöver inte vara helt rund. Ibland består den av flera raka murfält och blir mångkantig, men avslutar fortfarande koret på samma sätt.", [3]],
      ["Både halvrunda och mångkantiga absider finns i bysantinsk, romansk och gotisk kyrkoarkitektur.", [6]],
      ["Vi föredrar runda absider, men i brist på annat godtar vi mångkantiga. Det sägs ju att en kyrka utan absid är som en bäver utan skinnbrallor, så huvudsaken är att det finns en absid.", []],
    ],
  },
  {
    title: "Liten eller stor",
    paragraphs: [
      ["I en romansk landskyrka är absiden ofta en liten halvrund utbyggnad bakom koret. I större kyrkor kan flera absider ligga samlade kring samma kor. Formen är densamma, men skalan en annan.", [1]],
      ["Flera absider tillsammans kallas kapellkrans. Korets östparti med absid, kor och utstrålande kapell har på franska ett eget namn, chevet.", [1, 6]],
      ["Absider kunde också byggas vid sidoskeppens östra sida.", [4]],
    ],
  },
  {
    title: "Mot öster",
    paragraphs: [
      ["Absiden ligger vanligen i kyrkans östra del. Det är dock inte alltid samma sak som exakt österut: platsen, terrängen och äldre murar kan ha fått bestämma riktningen.", [1]],
      ["Långhusets riktning går oftast från väster mot öster, där solen går upp. Solen har varit en symbol för Gud och för Jesu Kristi uppståndelse.", [1]],
      ["Koret ligger nästan alltid i kyrkans östligaste del, och tornet står vanligen i väster.", [1]],
    ],
  },
  {
    title: "Målningar i valvet",
    paragraphs: [
      ["På insidan kan valvet vara målat med Kristus, helgon eller bibliska berättelser. När färgen finns kvar är den ett ovanligt direkt spår av hur rummet en gång användes.", [2]],
      ["Ett av den romanska bildkonstens mest omtyckta motiv är Majestas Domini, Kristus i majestät. I Vä kyrka i Skåne sitter han i absiden på regnbågen, i en mandorla och omgiven av evangelisternas symboler.", [10, 9]],
      ["I Hackås kyrka har absiden kalkmålningar från 1200-talet med motiv ur legenden om Sankta Margareta.", [12]],
      ["Målningar kan ha varit dolda länge. I Vaksala kyrka kalkades målningarna från 1300-talet över 1793–1795 och togs inte fram igen förrän vid restaureringen 1929.", [11]],
    ],
  },
  {
    title: "Spår av ombyggnader",
    paragraphs: [
      ["Kyrkor byggs om. Fönster flyttas, sakristior byggs till och putsen förnyas. Ibland syns absiden bäst inifrån, ibland bara som en gammal murfog i fasaden.", [3]],
      ["Ett fotografi visar mer än formen: stenarna, putsen, fönstren och senare lagningar. Två absider kan ha samma grundform och ändå bära helt olika spår av sin historia.", [3]],
      ["När Fleninge kyrka byggdes om 1839–1840 revs större delen av långhusets och korets yttermurar. Absiden stod kvar men fick en dörr i norr och ett fönster i söder.", [8]],
      ["Lunds domkyrkas absid var 1779 i så dåligt skick att den höll på att störta ner. Den monterades ned och byggdes upp igen 1780–1785, med ornamentstenarna numrerade så att de kom tillbaka på rätt plats.", [13]],
    ],
  },
  {
    title: "Så hittar du absiden",
    paragraphs: [
      ["Utifrån går absiden ofta att hitta vid koret. Följ takfoten och se efter en utbyggnad som skiljer sig från långhuset i höjd, takform eller fönstersättning.", [3]],
      ["Absiden avslutar korets östra sida, så gå till kyrkans östra ände.", [1]],
      ["Inne i kyrkan ligger koret längst fram, framför långhuset, ofta med högre golv. Där står altaret, som i medeltida kyrkor ofta är placerat i absiden.", [1]],
    ],
  },
];

// A panel and the space under it, before the next one in the same column.
const panelClass = `mb-8 ${signPanelClass}`;

/**
 * The start page as an old information sign: the title and the ingress
 * between the double rules, then the panels set as three printed columns with
 * a rule between them, and the sources along the bottom. A panel is one
 * subject under its own heading, either a church (a photo in the same format
 * every time, with the church's name under it) or a topic about apses. The
 * two take turns down the columns, so every column holds both.
 */
export default function HomeView({ places }: { places: Record<string, ApsisPlace> }) {
  const posts = useApsisPosts();
  const apsisPosts = posts.filter((post) => post.has_apsis);
  const [visibleCount, setVisibleCount] = useState(INITIAL_POSTS);
  const visiblePosts = apsisPosts.slice(0, visibleCount);

  // A church first, then a topic, in turn; whichever is left over follows.
  const panels: Array<{ post: ApsisPost } | { topic: (typeof TOPICS)[number] }> = [];
  for (let index = 0; index < Math.max(visiblePosts.length, TOPICS.length); index++) {
    if (visiblePosts[index]) panels.push({ post: visiblePosts[index] });
    if (TOPICS[index]) panels.push({ topic: TOPICS[index] });
  }

  // The church source is only listed when a panel refers to it.
  const sources = visiblePosts.some((post) => places[post.svenska_kyrkan_place_id]) ? [...SOURCES, CHURCH_SOURCE] : SOURCES;

  const churchPanel = (post: ApsisPost) => {
    const image = post.files?.[0];
    const place = places[post.svenska_kyrkan_place_id];
    const ownComment = post.content && post.content !== post.name && post.content !== "Absidfoto" ? post.content : "";
    const location = place ? [place.owner_name, place.municipality, place.county].filter(Boolean).join(", ") : post.geolocation;
    const name = post.name || place?.name || "Okänd kyrka";

    return (
      <section key={post.id} aria-labelledby={`kyrka-${post.id}`} className={`break-inside-avoid ${panelClass}`}>
        {/* The same landscape format for every photo, so they line up.
            Landscape photos are shown whole (a square cut off the towers at
            the edges); standing ones are cut above and below, weighted
            downwards, where the church stands. The whole photo is on the
            church's own page. */}
        <Link href={`/kyrka/${post.id}`} className={`apsis-photo block ${signPrintClass}`} aria-hidden="true" tabIndex={-1}>
          {image ? (
            <Image src={fileProxyUrl(image.url)} alt="" width={880} height={660} sizes="(min-width: 1024px) 33vw, 100vw" className="aspect-[4/3] w-full object-cover object-[50%_70%]" />
          ) : (
            <div className="aspect-[4/3] w-full border border-border bg-surface-2" />
          )}
        </Link>
        <h2 id={`kyrka-${post.id}`} className="mt-4 font-display text-xl font-semibold leading-8 text-text">
          <Link href={`/kyrka/${post.id}`} className="apsis-link">{name}</Link>
        </h2>
        {/* What comes from Svenska kyrkan says so, with the church's own source number. */}
        {location && <p className={`italic ${signBodyClass}`}>{location}{place && !place.short_description && <SourceRefs numbers={[CHURCH_SOURCE.number]} />}</p>}
        {place?.short_description && <p className={`mt-3 whitespace-pre-line ${signBodyClass} ${signTextClass}`}>{place.short_description}<SourceRefs numbers={[CHURCH_SOURCE.number]} /></p>}
        {ownComment && <p className={`mt-3 ${signBodyClass} ${signTextClass}`}>{ownComment}</p>}
      </section>
    );
  };

  return (
    <Sign
      title="Absider"
      figure={<ApseDrawing className="w-full" />}
      lead={<>{INGRESS[0]}<SourceRefs numbers={INGRESS[1]} /></>}
      imprint={<SignSources sources={sources} />}
    >
        {/* Printed columns: the panels run down one column and on into the
            next. A church is kept whole; a topic may continue in the next
            column, the way running text does. */}
        <div className="gap-x-10 lg:columns-3 lg:[column-rule:1px_solid_var(--border)]">
          {panels.map((panel) =>
            "post" in panel ? (
              churchPanel(panel.post)
            ) : (
              <section key={panel.topic.title} className={panelClass}>
                <h2 className={`break-after-avoid ${signHeadingClass}`}>{panel.topic.title}</h2>
                <div className={`mt-2 space-y-4 ${signBodyClass} ${signTextClass}`}>
                  {panel.topic.paragraphs.map(([text, paragraphSources]) => (
                    <p key={text} className="break-inside-avoid">{text}<SourceRefs numbers={paragraphSources} /></p>
                  ))}
                </div>
              </section>
            ),
          )}
        </div>

        {apsisPosts.length === 0 && <p className={`pt-8 ${signBodyClass}`}>Ännu inga fotografier av absider.</p>}
        {visibleCount < apsisPosts.length && <div className="pt-2 text-center"><Button variant="secondary" rounded="rounded-none" className="apsis-press" onClick={() => setVisibleCount((count) => count + POSTS_PER_LOAD)}>Visa fler kyrkor</Button></div>}
    </Sign>
  );
}
