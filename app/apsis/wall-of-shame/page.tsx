"use client";

import Image from "next/image";
import Link from "next/link";
import { useApsisPosts } from "@/app/apsis/_state/apsis-context";
import { fileProxyUrl } from "@/app/lib/files";
import { ApseDrawing } from "@/app/apsis/ui/ApseDrawing";
import { Sign, signBodyClass, signPanelClass, signPrintClass } from "@/app/apsis/ui/Sign";

/**
 * The churches without an apse, as a sign like the start page: three columns
 * of panels under a rule each, a photo in the same format every time with the
 * church's name under it.
 */
export default function WallOfShamePage() {
  const absentApsisPosts = useApsisPosts().filter((post) => !post.has_apsis);

  return (
    <Sign
      title="Wall of shame"
      figure={<ApseDrawing withApse={false} className="w-full" />}
      lead="Det sägs att varje gång en kyrka byggs utan en absid gråter Jesubarnet. Här hamnar kyrkorna som fått även oss att fälla tårar."
    >
        {absentApsisPosts.length === 0 ? (
          <p className={signBodyClass}>Inga kyrkor på listan ännu.</p>
        ) : (
          <div className="grid items-start gap-x-8 gap-y-10 lg:grid-cols-3">
            {absentApsisPosts.map((church) => {
              const image = church.files?.[0];
              const ownComment = church.content && church.content !== church.name && church.content !== "Absidfoto" ? church.content : "";

              return (
                <section key={church.id} aria-labelledby={`kyrka-${church.id}`} className={signPanelClass}>
                  <Link href={`/kyrka/${church.id}`} className={`apsis-photo block ${signPrintClass}`} aria-hidden="true" tabIndex={-1}>
                    {image ? (
                      <Image src={fileProxyUrl(image.url)} alt="" width={880} height={660} sizes="(min-width: 1024px) 33vw, 100vw" className="aspect-[4/3] w-full object-cover object-[50%_70%]" />
                    ) : (
                      <div className="aspect-[4/3] w-full border border-border bg-surface-2" />
                    )}
                  </Link>
                  <h2 id={`kyrka-${church.id}`} className="mt-4 font-display text-xl font-semibold leading-8 text-text">
                    <Link href={`/kyrka/${church.id}`} className="apsis-link">{church.name || "Okänd kyrka"}</Link>
                  </h2>
                  {church.geolocation && <p className={`italic ${signBodyClass}`}>{church.geolocation}</p>}
                  {ownComment && <p className={`mt-3 ${signBodyClass}`}>{ownComment}</p>}
                </section>
              );
            })}
          </div>
        )}
    </Sign>
  );
}
