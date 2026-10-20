"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Button } from "@/app/components/ui/Button";
import { ShuffleIcon } from "lucide-react";
import { getApsisPlace } from "@/app/actions/apsis";
import { useApsisPosts } from "@/app/apsis/_state/apsis-context";
import { SOURCE, buildingFacts, churchSources } from "@/app/apsis/kyrka/[id]/post-view";
import { fileProxyUrl } from "@/app/lib/files";
import type { ApsisPlace } from "@/app/lib/dal";
import { Sign, SignFacts, SignSources, SourceRef, signBodyClass } from "@/app/apsis/ui/Sign";
import { WeatherVane } from "@/app/apsis/ui/WeatherVane";

// A line's place in the order the church's lines arrive in.
const step = (index: number) => ({ "--i": index }) as CSSProperties;

const subscribeToNothing = () => () => {};

const photoClass ="absolute inset-0 size-full object-cover object-[50%_70%]";

/**
 * One church drawn at random, as a sign of its own: the photo with its
 * caption to the left and, beside it, the church's name, what Svenska kyrkan
 * says about it and a fact table.
 *
 * Every church gets a table, connected to Svenska kyrkan or not: what the
 * post itself knows (apse or not, position) stands first, and the parish and
 * the building facts follow when the church's own record has them.
 *
 * A draw is not finished at once: the photo has to arrive, and the building
 * facts are read from the church's own record. The vane beside the title
 * swings for as long as either is on its way. The photo before stays in place,
 * dimmed, until the new one has arrived and fades in over it, so the frame is
 * never empty between two draws.
 */
export default function SlumpaView({ places }: { places: Record<string, ApsisPlace> }) {
  const posts = useApsisPosts();
  // The first draw is made in the browser: a draw on the server would not
  // match the browser's, so the server (and hydration) shows no church yet.
  const inBrowser = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const [drawnId, setId] = useState<number | null>(() =>
    posts.length > 0 ? posts[Math.floor(Math.random() * posts.length)].id : null,
  );
  const id = inBrowser ? drawnId : null;
  // The photo that has arrived, by URL, so a new draw starts out as waiting.
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  // The photo of the draw before, kept under the new one.
  const [previousUrl, setPreviousUrl] = useState<string | null>(null);
  // The full record of each church drawn so far, with the building facts the
  // summaries leave out; null when it could not be read.
  const [records, setRecords] = useState<Record<string, ApsisPlace | null>>({});

  const pickRandom = () => {
    if (posts.length === 0) return;
    const pool = posts.length > 1 ? posts.filter((post) => post.id !== id) : posts;
    setPreviousUrl(loadedUrl);
    setId(pool[Math.floor(Math.random() * pool.length)].id);
  };

  const post = posts.find((candidate) => candidate.id === id) ?? null;
  const placeId = post?.svenska_kyrkan_place_id ?? "";

  useEffect(() => {
    if (!placeId || placeId in records) return;
    let current = true;
    getApsisPlace(placeId).then((record) => {
      if (current) setRecords((known) => ({ ...known, [placeId]: record }));
    });
    return () => {
      current = false;
    };
  }, [placeId, records]);

  const image = post?.files[0];
  const record = placeId ? records[placeId] : undefined;
  const place = record ?? (placeId ? places?.[placeId] : undefined);
  const name = post?.name || place?.name || "Okänd kyrka";
  const location = place ? [place.municipality, place.county].filter(Boolean).join(", ") : "";
  const ownComment = post?.content && post.content !== post.name && post.content !== "Absidfoto" ? post.content : "";
  const added = post?.created_at ? new Date(post.created_at).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" }) : "";
  // A row taken from Svenska kyrkan carries the number of its source; what
  // Apsis itself holds about the post carries none.
  const facts = ([
    ["Absid", post ? (post.has_apsis ? "Ja" : "Saknas") : ""],
    ["Församling", place?.owner_name ?? "", SOURCE.church],
    ...(record?.building ? buildingFacts(record.building).map(([label, value]) => [label, value, SOURCE.building]) : []),
    ["Att se", place?.tags.join(", ") ?? "", SOURCE.church],
    ["Läge", post?.geolocation ?? ""],
    ["Tillagd", added],
  ] as Array<[string, string, number?]>).filter(([, value]) => value);

  // The caption: the photo's number in the collection.
  const number = post ? posts.indexOf(post) + 1 : 0;

  const photoWaiting = Boolean(image) && loadedUrl !== image?.url;
  const recordWaiting = Boolean(placeId) && record === undefined;

  return (
    <Sign
      title="Slumpa"
      lead="En kyrka ur samlingen, dragen på måfå."
      figure={<WeatherVane turning={photoWaiting || recordWaiting} className="mx-auto block" />}
      smallFigure
      imprint={place && <SignSources sources={churchSources(place, { church: true, building: Boolean(record?.building) })} />}
      // The button stands with the title, so it is in the same place at every
      // draw however much there is to say about the church.
      action={
        posts.length > 0 && (
          <Button className="apsis-press whitespace-nowrap" rounded="rounded-none" onClick={pickRandom}>
            <ShuffleIcon size={16} />
            Slumpa fram en till
          </Button>
        )
      }
    >
        {!post ? (
          <p className={signBodyClass}>{posts.length === 0 ? "Inga absidfoton att slumpa bland ännu." : "Drar en kyrka …"}</p>
        ) : (
          // Two parts side by side: the photo over three of five columns and
          // everything about the church in the other two.
          <div className={`grid items-start gap-x-10 gap-y-8 lg:grid-cols-5 ${signBodyClass}`}>
            <figure className="lg:col-span-3">
              {/* The photo's place is held from the start, so nothing moves
                  when it arrives. */}
              <Link href={`/kyrka/${post.id}`} aria-label={`Läs mer om ${name}`} className="apsis-photo relative block aspect-[4/3] overflow-hidden bg-surface-2">
                {previousUrl && previousUrl !== image?.url && (
                  <Image
                    key={previousUrl}
                    src={fileProxyUrl(previousUrl)}
                    alt=""
                    width={1200}
                    height={900}
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    className={`${photoClass} apsis-dim`}
                    data-waiting={photoWaiting || undefined}
                  />
                )}
                {image && (
                  <Image
                    key={image.url}
                    src={fileProxyUrl(image.url)}
                    alt={name}
                    width={1200}
                    height={900}
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    loading="eager"
                    onLoad={() => setLoadedUrl(image.url)}
                    // Hidden until it has arrived, then faded in over the one before.
                    className={`${photoClass} ${photoWaiting ? "opacity-0" : "apsis-develop"}`}
                  />
                )}
                {photoWaiting && (
                  <span role="status" className="apsis-wait absolute bottom-0 left-0 bg-bg px-3 py-1 text-sm italic text-text-muted">Fotografiet hämtas …</span>
                )}
              </Link>
              <figcaption className="mt-2 text-sm italic leading-6 text-text-muted">Nr {number} av {posts.length} i samlingen</figcaption>
            </figure>

            {/* Keyed by the church, so its lines arrive anew at every draw, one
                after another in the order --i gives them. */}
            <section key={post.id} className="lg:col-span-2">
              <h2 className="apsis-arrive font-display text-xl font-semibold text-text">
                <Link href={`/kyrka/${post.id}`} className="apsis-link">{name}</Link>
              </h2>
              {location && <p className="apsis-arrive mt-1 italic" style={step(1)}>{location}</p>}
              {ownComment && <p className="apsis-arrive mt-3 italic" style={step(2)}>{ownComment}</p>}
              {place?.short_description && <p className="apsis-arrive mt-4 whitespace-pre-line" style={step(2)}>{place.short_description}<SourceRef number={SOURCE.church} /></p>}
              {placeId && record === null && !place && <p className="apsis-arrive mt-4" style={step(2)}>Uppgifterna från Svenska kyrkan kunde inte hämtas.</p>}

              {/* A row that comes with the building facts arrives when they do. */}
              <SignFacts className="mt-5" facts={facts}>
                {recordWaiting && <p role="status" className="apsis-wait py-0.5 italic">Byggnadsfakta hämtas …</p>}
              </SignFacts>

              <p className="apsis-arrive mt-4" style={step(5)}><Link href={`/kyrka/${post.id}`} className="text-text underline underline-offset-4">Läs mer om kyrkan</Link></p>
            </section>
          </div>
        )}
    </Sign>
  );
}
