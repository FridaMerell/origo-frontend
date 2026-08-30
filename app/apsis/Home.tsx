"use client";

import { useApsisPosts } from "@/app/lib/apsis-context";
import { fileProxyUrl } from "@/app/lib/files";

export default function Home() {
  const posts = useApsisPosts();

  return (
    <div className="container">
      <p className="px-6 pt-7 pb-2 text-sm leading-relaxed text-text-muted sm:px-12">
        En samling foton av kyrkoabsider — det halvrunda utrymmet bakom altaret.
        Bläddra i väggen nedan, eller låt Slumpa välja en åt dig. Logga in för att
        lägga till egna bilder.
      </p>

      {posts.length === 0 ? (
        <p className="px-6 py-16 text-sm text-text-faint sm:px-12">
          Inga absidfoton ännu.
        </p>
      ) : (
        <div className="px-6 pt-6 pb-12 [column-gap:20px] [columns:220px_3] sm:px-12">
          {posts.map((post) => {
            const image = post.files[0];
            return (
              <figure key={post.id} className="mb-5 [break-inside:avoid]">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fileProxyUrl(image.url)}
                    alt={post.name || "Kyrkoabsid"}
                    className="w-full rounded-card border border-border bg-surface-2"
                  />
                ) : (
                  <div className="h-48 w-full rounded-card border border-border bg-surface-2" />
                )}
                {post.name && (
                  <figcaption className="mt-2 font-display text-[13px] font-semibold text-text-muted">
                    {post.name}
                  </figcaption>
                )}
              </figure>
            );
          })}
        </div>
      )}
    </div>
  );
}
