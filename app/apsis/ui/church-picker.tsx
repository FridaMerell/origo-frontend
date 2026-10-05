"use client";

import { useEffect, useRef, useState } from "react";
import { fieldInputClass } from "@/app/components/form/Field";
import { searchApsisPlaces } from "@/app/actions/apsis";
import type { ApsisPlace } from "@/app/lib/dal";

/** The line that tells churches with the same name apart. */
export function churchDetail(place: ApsisPlace): string {
  return [place.owner_name, place.municipality, place.county].filter(Boolean).join(" · ");
}

/** Search Svenska kyrkan's churches and pick the one an Apsis post shows. */
export function ChurchPicker({
  selected,
  onSelect,
  onClear,
}: {
  selected: { name: string; detail?: string } | null;
  onSelect: (place: ApsisPlace) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ApsisPlace[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setMessage(null);
      return;
    }
    const current = ++requestId.current;
    const timer = setTimeout(async () => {
      const result = await searchApsisPlaces(q);
      if (current !== requestId.current) return;
      setHits(result.hits);
      setMessage(result.error ?? (result.hits.length === 0 ? "Inga kyrkor hittades." : null));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="flex flex-col gap-1 text-sm text-text-muted">
      <label htmlFor="apsis-church-search">Kyrka</label>
      {selected ? (
        <div className="flex items-start justify-between gap-2 rounded border border-field-border bg-surface-2 px-2.5 py-1.5">
          <span className="min-w-0">
            <span className="block text-text">{selected.name}</span>
            {selected.detail && <span className="block text-xs">{selected.detail}</span>}
          </span>
          <button type="button" onClick={onClear} className="shrink-0 text-xs text-text-faint hover:text-text">
            Byt kyrka
          </button>
        </div>
      ) : (
        <>
          <input
            id="apsis-church-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Sök bland Svenska kyrkans kyrkor"
            autoComplete="off"
            className={fieldInputClass}
          />
          {hits.length > 0 && (
            <ul className="rounded border border-field-border bg-surface">
              {hits.map((hit) => (
                <li key={hit.id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      onSelect(hit);
                    }}
                    className="block w-full px-2.5 py-1.5 text-left hover:bg-surface-2"
                  >
                    <span className="text-text">{hit.name}</span>
                    <span className="block text-xs">{churchDetail(hit)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {message && <p className="text-xs">{message}</p>}
        </>
      )}
    </div>
  );
}
