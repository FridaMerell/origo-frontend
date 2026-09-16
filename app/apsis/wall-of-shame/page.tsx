"use client";

import { useApsisPosts } from "@/app/lib/apsis-context";

export default function WallOfShamePage() {
  const absentApsisPosts = useApsisPosts().filter((post) => !post.has_apsis);

  return (
    <div className="container py-6 sm:py-10">
      <main className="border border-border bg-surface px-6 py-8 sm:px-10 sm:py-12">
        <h1 className="font-display text-4xl font-semibold text-text sm:text-5xl">Wall of shame</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-text-muted">Det sägs att varje gång en kyrka byggs utan en absid gråter Jesubarnet. Här hamnar kyrkorna som fått även oss att fälla tårar.</p>

        {absentApsisPosts.length === 0 ? (
          <p className="mt-8 border-y border-border py-8 text-text-muted">Inga kyrkor på listan ännu.</p>
        ) : (
          <ol className="mt-8 divide-y divide-border border-y border-border">
            {absentApsisPosts.map((church, index) => (
              <li key={church.id} className="grid gap-2 py-5 sm:grid-cols-[3rem_1fr] sm:gap-5">
                <span className="text-sm text-text-faint">{index + 1}.</span>
                <div>
                  <h2 className="font-display text-xl font-semibold text-text">{church.name || "Okänd kyrka"}</h2>
                  {church.geolocation && <p className="mt-1 text-sm text-text-muted">{church.geolocation}</p>}
                  {church.content && church.content !== church.name && <p className="mt-2 text-base leading-7 text-text-muted">{church.content}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
