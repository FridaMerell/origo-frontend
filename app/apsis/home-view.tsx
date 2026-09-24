"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { useApsisPosts } from "./_state/apsis-context";
import { fileProxyUrl } from "@/app/lib/files";

const INITIAL_POSTS = 2;
const POSTS_PER_LOAD = 2;

const additionalTextPairs = [
  [
    "I en romansk landskyrka är absiden ofta en liten halvrund utbyggnad bakom koret. I större kyrkor kan flera absider ligga samlade kring samma kor. Formen är densamma, men skalan en annan.",
    "Absiden ligger vanligen i kyrkans östra del. Det är dock inte alltid samma sak som exakt österut: platsen, terrängen och äldre murar kan ha fått bestämma riktningen.",
  ],
  [
    "Runda bågar, små fönster och tjocka murar är vanliga i romanska absider. Murarna bär valvet, medan fönstren släpper in ljus över altaret.",
    "På insidan kan valvet vara målat med Kristus, helgon eller bibliska berättelser. När färgen finns kvar är den ett ovanligt direkt spår av hur rummet en gång användes.",
  ],
  [
    "En absid behöver inte vara helt rund. Ibland består den av flera raka murfält och blir mångkantig, men avslutar fortfarande koret på samma sätt.",
    "Kyrkor byggs om. Fönster flyttas, sakristior byggs till och putsen förnyas. Ibland syns absiden bäst inifrån, ibland bara som en gammal murfog i fasaden.",
  ],
  [
    "Ett fotografi visar mer än formen: stenarna, putsen, fönstren och senare lagningar. Två absider kan ha samma grundform och ändå bära helt olika spår av sin historia.",
    "Utifrån går absiden ofta att hitta vid koret. Följ takfoten och se efter en utbyggnad som skiljer sig från långhuset i höjd, takform eller fönstersättning.",
  ],
];

export default function HomeView() {
  const posts = useApsisPosts();
  const apsisPosts = posts.filter((post) => post.has_apsis);
  const [visibleCount, setVisibleCount] = useState(INITIAL_POSTS);
  const [lightboxPostId, setLightboxPostId] = useState<number | null>(null);
  const visiblePosts = apsisPosts.slice(0, visibleCount);
  const lightboxPost = apsisPosts.find((post) => post.id === lightboxPostId);
  // Apsis uploads store a thumbnail before the original. Older posts only have the original.
  const lightboxImage = lightboxPost?.files?.[1] ?? lightboxPost?.files?.[0];

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxPostId(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const imageFigure = (post: (typeof visiblePosts)[number], className = "") => {
    const image = post.files?.[0];
    const hasSeparateDescription = post.content && post.content !== post.name;

    return (
      <figure key={post.id} className={className}>
        {image ? (
          <button type="button" onClick={() => setLightboxPostId(post.id)} className="block w-full cursor-zoom-in" aria-label={`Visa större bild av ${post.name || "kyrkoabsid"}`}>
            <Image src={fileProxyUrl(image.url)} alt={post.name || "Kyrkoabsid"} width={440} height={440} sizes="(min-width: 640px) 40vw, 100vw" className="h-auto w-full" />
          </button>
        ) : (
          <div className="h-48 w-full border border-border bg-surface-2" />
        )}
        <figcaption className="pt-2 text-xs leading-5 text-text-muted">
          <p className="italic"><span className="font-semibold text-text">{post.name || "Okänd kyrka"}</span>{post.geolocation && <span>, {post.geolocation}</span>}.</p>
          {hasSeparateDescription && <p className="mt-1 italic">{post.content}</p>}
        </figcaption>
      </figure>
    );
  };

  const textParagraph = (text: string, source: 1 | 2 | 3, key: string, className = "") => (
    <p key={key} className={className}>
      {text} <a className="text-text underline underline-offset-2" href={`#kalla-${source}`}>[{source}]</a>
    </p>
  );

  return (
    <div className="container py-6 sm:py-10">
      <main className="px-6 py-7 sm:px-10 sm:py-9">
        <h1 className="font-display text-3xl font-semibold text-text sm:text-4xl">Absider</h1>

        <div className="mt-6 grid gap-x-8 gap-y-7 border-y border-border py-6 text-sm leading-6 text-text-muted md:grid-cols-3">
          <div className="space-y-5">
            {textParagraph("En absid är den välvda, halvrunda eller mångkantiga avslutningen av ett kyrkokor, ofta bakom altaret. Formen är äldre än de kristna kyrkorna och fanns redan i grekisk och romersk arkitektur.", 1, "intro-1")}
            {textParagraph("I Sverige började absider byggas under tidig medeltid. I Hackås kyrka i Jämtland hör den halvrunda absiden till kyrkans äldsta delar och har bevarade målningar från 1200-talet.", 3, "intro-3")}
          </div>
          <div className="space-y-5">
            {visiblePosts[0] && imageFigure(visiblePosts[0])}
            {textParagraph("I romanska kyrkor är absiden ofta liten, med tjocka murar, små rundbågiga fönster och ett halvt kupolvalv. Där samlas ljus, bild och liturgi i kyrkorummets avslutning.", 2, "intro-2")}
          </div>
          <div className="space-y-5">
            {visiblePosts[1] && imageFigure(visiblePosts[1])}
            <p>Vi föredrar runda absider, men i brist på annat godtar vi mångkantiga. Det sägs ju att en kyrka utan absid är som en bäver utan skinnbrallor, så huvudsaken är att det finns en absid.</p>
          </div>
          {additionalTextPairs.slice(0, Math.max(0, Math.ceil((visiblePosts.length - INITIAL_POSTS) / POSTS_PER_LOAD))).map((pair, pairIndex) => {
            const firstPost = visiblePosts[INITIAL_POSTS + pairIndex * POSTS_PER_LOAD];
            const secondPost = visiblePosts[INITIAL_POSTS + pairIndex * POSTS_PER_LOAD + 1];
            const source = pairIndex === 0 ? 1 : pairIndex === 1 ? 2 : 3;
            return (
              <div key={`blad-${pairIndex}`} className="col-span-full mt-1 grid gap-x-8 gap-y-7 border-t border-border pt-6 md:grid-cols-3">
                <div>{textParagraph(pair[0], source, `text-${pairIndex}-1`)}</div>
                <div>{firstPost && imageFigure(firstPost)}</div>
                <div className="space-y-5">
                  {textParagraph(pair[1], source, `text-${pairIndex}-2`)}
                  {secondPost && imageFigure(secondPost)}
                </div>
              </div>
            );
          })}
        </div>

        {apsisPosts.length === 0 && <p className="py-7 text-center text-sm text-text-muted">Ännu inga fotografier av absider.</p>}
        {visibleCount < apsisPosts.length && <div className="mt-5 text-center"><Button variant="secondary" rounded="rounded-none" size="sm" onClick={() => setVisibleCount((count) => count + POSTS_PER_LOAD)}>Ladda fler</Button></div>}

        <footer className="mt-8 text-xs leading-5 text-text-muted">
          <p id="kalla-1"><a className="underline underline-offset-2" href="https://www.svenskakyrkan.se/vad-ar-vad-i-kyrkan" target="_blank" rel="noreferrer">[1] Svenska kyrkan, “Vad är vad i kyrkan?”</a></p>
          <p id="kalla-2" className="mt-1"><a className="underline underline-offset-2" href="https://www.metmuseum.org/art/collection/search/472507" target="_blank" rel="noreferrer">[2] The Metropolitan Museum of Art, “Apse from San Martín at Fuentidueña”.</a></p>
          <p id="kalla-3" className="mt-1"><a className="underline underline-offset-2" href="https://www.svenskakyrkan.se/harnosandsstift/hackas-medeltida-kyrka" target="_blank" rel="noreferrer">[3] Härnösands stift, “Hackås medeltida kyrka”.</a></p>
        </footer>
      </main>

      {lightboxPost && lightboxImage && (
        <div role="dialog" aria-modal="true" aria-label={`Förstorad bild av ${lightboxPost.name || "kyrkoabsid"}`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5" onPointerDown={(event) => { if (event.target === event.currentTarget) setLightboxPostId(null); }}>
          <div className="relative w-full max-w-5xl">
            <button type="button" onClick={() => setLightboxPostId(null)} className="absolute right-0 top-0 z-10 flex size-10 -translate-y-12 items-center justify-center text-white hover:text-white/70" aria-label="Stäng bild"><X size={24} /></button>
            <Image src={fileProxyUrl(lightboxImage.url)} alt={lightboxPost.name || "Kyrkoabsid"} width={1200} height={900} sizes="100vw" className="block h-auto max-h-[80vh] w-full object-contain" />
            <p className="mt-3 text-sm italic text-white">{lightboxPost.name || "Okänd kyrka"}{lightboxPost.geolocation && `, ${lightboxPost.geolocation}`}{lightboxPost.content && lightboxPost.content !== lightboxPost.name && ` — ${lightboxPost.content}`}</p>
          </div>
        </div>
      )}
    </div>
  );
}
