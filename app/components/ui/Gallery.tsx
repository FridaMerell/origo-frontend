"use client";

import { useEffect, useState, type PointerEvent, type ReactNode } from "react";
import Image from "next/image";
import { fileProxyUrl, normalizeFileUrls, type FileLike } from "@/app/lib/files";
import { ChevronLeft, ChevronRight, Paperclip, X } from "lucide-react"

const IMAGE_EXTENSION = /\.(png|jpe?g|gif|webp|avif|svg)$/i;

export function Lightbox({
  images,
  index,
  onClose,
  onNavigate,
  captions,
}: {
  images: string[]
  index: number
  onClose: () => void
  onNavigate: (index: number) => void
  // One caption per image; when given, the photo gets a full dark stage with
  // the caption, counter and arrows below or beside it.
  captions?: ReactNode[]
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
  const previous = () => onNavigate((index - 1 + images.length) % images.length)
  const next = () => onNavigate((index + 1) % images.length)
  const closeOnBackdrop = (event: PointerEvent) => {
    if (event.target === event.currentTarget) onClose()
  }

  if (captions) {
    return (
      <div
        className="fixed inset-0 z-50 grid grid-rows-[minmax(0,1fr)_auto] gap-4 bg-[rgb(14,11,8)] pt-14 pb-4 sm:px-16 sm:pt-16 sm:pb-8"
        onPointerDown={closeOnBackdrop}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Stäng"
          className="absolute right-2 top-2 p-2 text-white/70 hover:text-white sm:right-4 sm:top-4"
        >
          <X size={24} />
        </button>

        <div className="relative flex min-h-0 items-center justify-center" onPointerDown={closeOnBackdrop}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fileProxyUrl(url)} alt="" className="max-h-full max-w-full object-contain" />
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={previous}
                aria-label="Föregående"
                className="absolute -left-14 p-2 text-white/70 hover:text-white max-sm:hidden"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Nästa"
                className="absolute -right-14 p-2 text-white/70 hover:text-white max-sm:hidden"
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}
        </div>

        <div className="flex items-end justify-between gap-4 px-4 text-white sm:px-0">
          <div className="min-w-0">{captions[index]}</div>
          {images.length > 1 && (
            <div className="flex shrink-0 items-center gap-1 text-sm tabular-nums text-white/60">
              <span className="mr-1">{index + 1} / {images.length}</span>
              <button type="button" onClick={previous} aria-label="Föregående" className="p-2 text-white/70 hover:text-white sm:hidden">
                <ChevronLeft size={24} />
              </button>
              <button type="button" onClick={next} aria-label="Nästa" className="p-2 text-white/70 hover:text-white sm:hidden">
                <ChevronRight size={24} />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Stäng"
        className="absolute right-4 top-4 text-white/80 hover:text-white"
      >
        <X size={24} />
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
          <ChevronLeft size={28} />
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
          <ChevronRight size={28} />
        </button>
      )}
    </div>
  );
}

export function Gallery({ files }: { files: FileLike[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const urls = normalizeFileUrls(files);

  if (urls.length === 0) return null;

  const images = urls.filter((url) => IMAGE_EXTENSION.test(url));
  const others = urls.filter((url) => !IMAGE_EXTENSION.test(url));

  return (
    <div className="flex flex-col gap-3">
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="relative block aspect-square overflow-hidden rounded border border-border bg-surface-2"
            >
              <Image
                src={fileProxyUrl(url)}
                alt=""
                fill
                sizes="(min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover"
              />
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
              <Paperclip size={14} />
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
