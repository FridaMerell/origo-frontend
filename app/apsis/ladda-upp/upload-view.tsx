"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/Button";
import { Checkbox, Field, fieldInputClass } from "@/app/components/form/Field";
import { FileUpload } from "@/app/components/ui/FileUpload";
import { useUploadedFiles } from "@/app/components/form/useUploadedFiles";
import { useUser } from "@/app/lib/user-context";
import { createApsisPost } from "@/app/actions/apsis";
import { ChurchPicker, churchDetail } from "@/app/apsis/ui/church-picker";
import { Sign } from "@/app/apsis/ui/Sign";
import type { ApsisPlace } from "@/app/lib/dal";
import { PlacePicker } from "@/app/tempus/observationer/quick-observation/place-picker";
import { parseLatLon } from "@/app/tempus/formatters";

export default function UploadView() {
  const user = useUser();
  const router = useRouter();

  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [hasApsis, setHasApsis] = useState(true);
  const uploadedFiles = useUploadedFiles();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // The church comes from Svenska kyrkan; name and position are only typed by
  // hand for a church it does not list.
  const [place, setPlace] = useState<ApsisPlace | null>(null);
  const [manual, setManual] = useState(false);

  if (!user) {
    return (
      <Sign title="Ladda upp" lead="Logga in för att lägga till egna absidfoton i samlingen.">
        <Button className="apsis-press whitespace-nowrap" rounded="rounded-none" onClick={() => router.push("/login")}>
          Logga in
        </Button>
      </Sign>
    );
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (uploadedFiles.files.length === 0) {
      setError("Välj en bild att ladda upp.");
      return;
    }
    if (!place && !manual) {
      setError("Välj en kyrka.");
      return;
    }
    const coordinates = place
      ? { lat: place.latitude, lon: place.longitude }
      : parseLatLon(lat, lon);
    if ("error" in coordinates) {
      setError(coordinates.error);
      return;
    }
    setSubmitting(true);
    const result = await createApsisPost(
      {
        name: place ? place.name : name,
        has_apsis: hasApsis,
        svenska_kyrkan_place_id: place?.id ?? "",
        geolocation:
          coordinates.lat === null || coordinates.lon === null
            ? ""
            : `${coordinates.lat.toFixed(6)}, ${coordinates.lon.toFixed(6)}`,
      },
      uploadedFiles.files.flatMap((file) =>
        file.thumbnailUrl
          ? [
              { name: `${file.name} (miniatyr)`, url: file.thumbnailUrl },
              { name: file.name, url: file.url },
            ]
          : [{ name: file.name, url: file.url }],
      ),
    );
    setSubmitting(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.push("/");
  };

  return (
    <Sign title="Ladda upp" lead="Lägg till ett fotografi av en kyrka i samlingen, med eller utan absid.">
        <form className="flex max-w-prose flex-col gap-4" onSubmit={onSubmit}>
      <ChurchPicker
        selected={place ? { name: place.name, detail: churchDetail(place) } : null}
        onSelect={(hit) => {
          setPlace(hit);
          setManual(false);
          setError(null);
        }}
        onClear={() => setPlace(null)}
      />

      {!place && !manual && (
        <button type="button" onClick={() => setManual(true)} className="-mt-2 self-start text-sm text-text-muted underline underline-offset-2 hover:text-text">
          Kyrkan finns inte hos Svenska kyrkan
        </button>
      )}

      {!place && manual && (
        <>
          <Field label="Kyrkans namn">
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="T.ex. San Martín, Fuentidueña"
              className={fieldInputClass}
            />
          </Field>

          <PlacePicker
            lat={lat}
            lon={lon}
            legend="Plats"
            onChange={({ lat: nextLat, lon: nextLon }) => {
              setLat(nextLat);
              setLon(nextLon);
            }}
            onClearError={() => setError(null)}
            onError={setError}
          />
        </>
      )}

      <Checkbox
        label="Kyrkan har en absid"
        checked={hasApsis}
        onChange={(event) => setHasApsis(event.target.checked)}
      />

      <div className="flex flex-col gap-1 text-sm">
        Bild
        <FileUpload
          folder="apsis"
          files={uploadedFiles.files}
          onChange={uploadedFiles.setFiles}
          multiple={false}
          accept="image/*"
          thumbnailOptions={{ maxEdge: 1024, quality: 0.78 }}
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" className="apsis-press w-fit whitespace-nowrap" rounded="rounded-none" disabled={submitting}>
        {submitting ? "Laddar upp..." : "Ladda upp"}
      </Button>
        </form>
    </Sign>
  );
}
