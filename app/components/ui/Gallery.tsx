"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { fileProxyUrl } from "@/app/lib/files";

const IMAGE_EXTENSION = /\.(png|jpe?g|gif|webp|avif|svg)$/i;

function Lightbox({
  images,
  index,
  onClose,
  onNavigate,
}: {
  images: string[]
  index: number
  onClose: () => void
  onNavigate: (index: number) => void
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNavigate((index + 1) % images.length);
      if (e.key === "ArrowLeft") onNavigate((index - 1 + images.length) % images.length);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [index, images.length, onClose, onNavigate]);

  const url = images[index];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Stäng"
        className="absolute right-4 top-4 text-white/80 hover:text-white"
      >
        <Icon name="x" size={24} />
      </button>

      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onNavigate((index - 1 + images.length) % images.length)
          }}
          aria-label="Föregående"
          className="absolute left-4 text-white/80 hover:text-white"
        >
          <Icon name="chevron-left" size={28} />
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fileProxyUrl(url)}
        alt=""
        className="max-h-full max-w-full rounded object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onNavigate((index + 1) % images.length)
          }}
          aria-label="Nästa"
          className="absolute right-4 text-white/80 hover:text-white"
        >
          <Icon name="chevron-right" size={28} />
        </button>
      )}
    </div>
  );
}

export function Gallery({ files }: { files: string[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (files.length === 0) return null;

  const images = files.filter((url) => IMAGE_EXTENSION.test(url));
  const others = files.filter((url) => !IMAGE_EXTENSION.test(url));

  return (
    <div className="flex flex-col gap-3">
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="block aspect-square overflow-hidden rounded border border-border bg-surface-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fileProxyUrl(url)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {others.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {others.map((url) => (
            <a
              key={url}
              href={fileProxyUrl(url)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-accent hover:underline"
            >
              <Icon name="paperclip" size={14} />
              {url.split("/").pop()}
            </a>
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
