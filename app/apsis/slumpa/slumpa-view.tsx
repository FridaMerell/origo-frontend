"use client";

import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Icon } from "@/app/components/ui/Icon";
import { useApsisPosts } from "@/app/lib/apsis-context";
import { fileProxyUrl } from "@/app/lib/files";

export default function SlumpaView() {
  const posts = useApsisPosts();
  const [id, setId] = useState<number | null>(null);

  const pickRandom = () => {
    if (posts.length === 0) return;
    const pool = posts.length > 1 ? posts.filter((post) => post.id !== id) : posts;
    setId(pool[Math.floor(Math.random() * pool.length)].id);
  };

  useEffect(() => {
    if (id === null && posts.length > 0) {
      setId(posts[Math.floor(Math.random() * posts.length)].id);
    }
  }, [id, posts]);

  const post = posts.find((candidate) => candidate.id === id) ?? null;

  if (posts.length === 0) {
    return (
      <p className="px-6 py-16 text-center text-sm text-text-faint sm:px-12">
        Inga absidfoton att slumpa bland ännu.
      </p>
    );
  }

  const image = post?.files[0];

  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-4 px-6 pt-7 pb-12 sm:px-12">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fileProxyUrl(image.url)}
          alt={post?.name || "Kyrkoabsid"}
          className="max-h-[360px] w-full rounded-card border border-border bg-surface-2 object-cover"
        />
      ) : (
        <div className="h-[360px] w-full rounded-card border border-border bg-surface-2" />
      )}
      {post?.name && <p className="text-[15px] font-semibold text-text">{post.name}</p>}
      <Button className="whitespace-nowrap" onClick={pickRandom}>
        <Icon name="shuffle" size={16} />
        Slumpa fram en till
      </Button>
    </div>
  );
}
