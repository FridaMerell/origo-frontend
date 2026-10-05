"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Button } from "@/app/components/ui/Button";
import { EditPostModal } from "@/app/apsis/edit-post-modal";
import { Sign, SignFacts, SignSources, SourceRef, signHeadingClass, signPrintClass, signTextClass, type SignSource } from "@/app/apsis/ui/Sign";
import { fileProxyUrl } from "@/app/lib/files";
import { useUser } from "@/app/lib/user-context";
import type { ApsisFacility, ApsisPlace, ApsisPost, ApsisWeekday } from "@/app/lib/dal";

const WEEKDAYS: Record<ApsisWeekday, string> = {
  mo: "måndag",
  tu: "tisdag",
  we: "onsdag",
  th: "torsdag",
  fr: "fredag",
  sa: "lördag",
  su: "söndag",
};

const FACILITIES: Record<ApsisFacility, string> = {
  toilet: "toalett",
  accessible_toilet: "tillgänglig toalett",
  cafe: "café",
  wifi: "wifi",
  parking: "parkering",
  charging_station: "laddstation",
  hearing_loop: "hörslinga",
  ramp: "ramp",
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * The few building facts worth a line on a sign, out of the ~70 fields
 * Kyrkobyggnadsregistret holds. KBR leaves out fields without a value.
 */
// The numbers a church's statements refer to their sources by. What Apsis
// itself holds about a post (apse or not, position, who added it and when)
// is the sign's own and carries no source.
export const SOURCE = { church: 1, building: 2 } as const;

/** The sources a church's sign draws on, out of those its statements refer to. */
export function churchSources(place: ApsisPlace | null | undefined, used: { church: boolean; building: boolean }): SignSource[] {
  const sources: Array<SignSource | false> = [
    used.church && { number: SOURCE.church, label: `Svenska kyrkan, uppgifter om ${place?.name || "kyrkan"}.`, href: place?.url || "https://www.svenskakyrkan.se" },
    used.building && { number: SOURCE.building, label: "Svenska kyrkan, Kyrkobyggnadsregistret.", href: "https://api.svenskakyrkan.se/doc/kyrkobyggnadsregistret/" },
  ];
  return sources.filter((source): source is SignSource => Boolean(source));
}

export function buildingFacts(building: Record<string, unknown>): Array<[label: string, value: string]> {
  const text = (key: string): string => {
    const value = building[key];
    if (typeof value === "number") return String(value);
    // KBR separates multiple values with a pipe.
    return typeof value === "string" ? value.split("|").join(", ").trim() : "";
  };
  const join = (parts: string[], separator: string) => parts.filter(Boolean).join(separator);
  const range = (from: string, to: string) => (from && to && from !== to ? `${from}–${to}` : from || to);
  // Building phases come as <phase>Fran, <phase>Till and <phase>Arkitekt.
  const phase = (key: string) => {
    const architect = text(`${key}Arkitekt`);
    return join([range(text(`${key}Fran`), text(`${key}Till`)), architect && `arkitekt ${architect}`], ", ");
  };

  const facts: Array<[string, string]> = [
    ["Byggd", phase("nybyggnad")],
    ["Invigd", text("invigning")],
    ["Ombyggd", phase("ombyggnad")],
    ["Planform", text("planform")],
    ["Material", join([text("materialStomme"), text("materialFasad")], ", ")],
    ["Stift", text("stift")],
  ];
  return facts.filter(([, value]) => value);
}

/**
 * One church as its own sign: the name between the double rules, then the
 * photo beside the fact tables, the text about the church under them, and the
 * publisher along the bottom.
 */
export default function PostView({ post, place }: { post: ApsisPost; place: ApsisPlace | null }) {
  const user = useUser();
  const router = useRouter();
  const [enlarged, setEnlarged] = useState(false);
  const [editing, setEditing] = useState(false);
  const thumbnail = post.files?.[0];
  // Apsis uploads store a thumbnail before the original. Older posts only have the original.
  const original = post.files?.[1] ?? thumbnail;
  const name = post.name || place?.name || "Okänd kyrka";
  // A row taken from Svenska kyrkan carries the number of its source; what
  // Apsis itself holds about the post carries none.
  const facts = ([
    ["Absid", post.has_apsis ? "Ja" : "Saknas"],
    ["Församling", place?.owner_name ?? "", SOURCE.church],
    ...(place?.building ? buildingFacts(place.building).map(([label, value]) => [label, value, SOURCE.building]) : []),
    // What the parish itself points out, e.g. "Astronomiska uret".
    ["Att se", place?.tags.join(", ") ?? "", SOURCE.church],
    ["Läge", post.geolocation],
  ] as Array<[string, string, number?]>).filter(([, value]) => value);
  const location = place ? [place.municipality, place.county].filter(Boolean).join(", ") : post.geolocation;
  // The short description is the ingress. Many places open the long one with
  // the same words, sometimes slightly reworded (seen live: "Sydölands" against
  // "Sydöland"), so the ingress is dropped when both begin alike and the long
  // text then stands on its own instead of being read twice.
  const longDescription = place?.long_description ?? "";
  const shortDescription = place?.short_description ?? "";
  const repeatsOpening = Boolean(shortDescription) && longDescription.slice(0, 24) === shortDescription.slice(0, 24);
  const ingress = repeatsOpening ? "" : shortDescription;
  const body = longDescription;
  const hasText = Boolean(ingress || body);
  const ownComment = post.content && post.content !== post.name && post.content !== "Absidfoto" ? post.content : "";
  const visitingAddress = place ? [place.address, [place.postal_code, place.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") : "";
  const hasVisit = Boolean(place && (place.open_hours.length > 0 || place.facilities.length > 0 || visitingAddress || place.phone || place.url));

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEnlarged(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <>
      <Sign
        title={name}
        lead={location}
        imprint={
          (place || user) && (
            <div className="flex flex-wrap items-end justify-between gap-3">
              {place ? <SignSources sources={churchSources(place, { church: true, building: Boolean(place.building) })} /> : <span />}
              {user && <Button variant="secondary" rounded="rounded-none" size="sm" className="apsis-press" onClick={() => setEditing(true)}>Redigera</Button>}
            </div>
          )
        }
      >
        {/* As on Slumpa: the photo with its caption over three of five
            columns and the fact tables in the other two. The text about the
            church follows under a rule, set in two columns. */}
        <div className="grid items-start gap-x-10 gap-y-8 text-base leading-7 text-text-muted lg:grid-cols-5">
          <figure className="lg:col-span-3">
            {thumbnail ? (
              <button type="button" onClick={() => setEnlarged(true)} className={`apsis-photo relative block aspect-[4/3] w-full cursor-zoom-in ${signPrintClass}`} aria-label={`Visa större bild av ${name}`}>
                <Image src={fileProxyUrl(thumbnail.url)} alt={name} width={1200} height={900} sizes="(min-width: 1024px) 60vw, 100vw" className="apsis-develop absolute inset-0 size-full object-cover object-[50%_70%]" priority />
              </button>
            ) : (
              <div className="aspect-[4/3] w-full bg-surface-2" />
            )}
            <figcaption className="mt-2 flex flex-wrap justify-between gap-x-6 text-sm italic leading-6">
              <span>{ownComment || (post.has_apsis ? "Absiden" : "Kyrkan saknar absid")}</span>
              {thumbnail && <span>Klicka på bilden för att se hela</span>}
            </figcaption>
          </figure>

          <div className="flex flex-col gap-6 lg:col-span-2">
            <section>
              <h2 className={signHeadingClass}>Fakta</h2>
              <SignFacts className="mt-2" facts={facts} />
            </section>

            {place && hasVisit && (
              <section>
                <h2 className={signHeadingClass}>Besök<SourceRef number={SOURCE.church} /></h2>
                <SignFacts
                  className="mt-2"
                  facts={([
                    ...place.open_hours.map((run) => [capitalize(run.from === run.to ? WEEKDAYS[run.from] : `${WEEKDAYS[run.from]}–${WEEKDAYS[run.to]}`), run.hours.join(", ")]),
                    ["På plats", capitalize(place.facilities.map((facility) => FACILITIES[facility] ?? facility).join(", "))],
                    ["Adress", visitingAddress],
                    ["Telefon", place.phone && <a href={`tel:${place.phone.replace(/\s/g, "")}`} className="apsis-link text-text">{place.phone}</a>],
                    ["Webb", place.url && <a href={place.url} target="_blank" rel="noreferrer" className="apsis-link text-text">svenskakyrkan.se</a>],
                  ] as Array<[string, ReactNode]>).filter(([, value]) => value)}
                />
              </section>
            )}
          </div>

          <section className="border-t border-text pt-5 lg:col-span-5">
            <h2 className={signHeadingClass}>Om kyrkan{hasText && <SourceRef number={SOURCE.church} />}</h2>
            <div className={`mt-2 gap-x-10 space-y-4 lg:columns-2 ${signTextClass}`}>
              {ingress && <p className="whitespace-pre-line font-semibold text-text">{ingress}</p>}
              {body && (
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h3 className="pt-1 font-display font-semibold text-text">{children}</h3>,
                    h2: ({ children }) => <h3 className="pt-1 font-display font-semibold text-text">{children}</h3>,
                    h3: ({ children }) => <h3 className="pt-1 font-display font-semibold text-text">{children}</h3>,
                    // Platser's texts contain links without a target; show those as plain text.
                    a: ({ href, children }) => href ? <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2">{children}</a> : <>{children}</>,
                  }}
                >
                  {body}
                </ReactMarkdown>
              )}
              {!hasText && (
                <p>
                  {place
                    ? "Svenska kyrkan har ingen beskrivning av kyrkan."
                    : post.svenska_kyrkan_place_id
                      ? "Uppgifterna från Svenska kyrkan kunde inte hämtas."
                      : "Inlägget är inte kopplat till någon av Svenska kyrkans kyrkor."}
                </p>
              )}
            </div>
          </section>
        </div>
      </Sign>

      {enlarged && original && (
        <div role="dialog" aria-modal="true" aria-label={`Förstorad bild av ${name}`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5" onPointerDown={(event) => { if (event.target === event.currentTarget) setEnlarged(false); }}>
          <div className="relative w-full max-w-5xl">
            <button type="button" onClick={() => setEnlarged(false)} className="absolute right-0 top-0 z-10 flex size-10 -translate-y-12 items-center justify-center text-white hover:text-white/70" aria-label="Stäng bild"><X size={24} /></button>
            <Image src={fileProxyUrl(original.url)} alt={name} width={1200} height={900} sizes="100vw" className="block h-auto max-h-[85vh] w-full object-contain" />
          </div>
        </div>
      )}

      {editing && <EditPostModal post={post} onClose={() => setEditing(false)} onDeleted={() => router.push("/")} />}
    </>
  );
}
