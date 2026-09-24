"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/Button";
import { Checkbox, Field, fieldInputClass } from "@/app/components/form/Field";
import { LockIcon } from "lucide-react";
import { FileUpload } from "@/app/components/ui/FileUpload";
import { useUploadedFiles } from "@/app/components/form/useUploadedFiles";
import { useUser } from "@/app/lib/user-context";
import { createApsisPost } from "@/app/actions/apsis";
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

  if (!user) {
    return (
      <div className="mx-auto flex max-w-[420px] flex-col items-center gap-4 px-6 pt-16 pb-12 text-center sm:px-12">
        <LockIcon size={26} className="text-text-muted" />
        <p className="text-sm text-text-muted">
          Logga in för att lägga till egna absidfoton i samlingen.
        </p>
        <Button className="whitespace-nowrap" onClick={() => router.push("/login")}>
          Logga in
        </Button>
      </div>
    );
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (uploadedFiles.files.length === 0) {
      setError("Välj en bild att ladda upp.");
      return;
    }
    const coordinates = parseLatLon(lat, lon);
    if ("error" in coordinates) {
      setError(coordinates.error);
      return;
    }
    setSubmitting(true);
    const result = await createApsisPost(
      {
        name,
        has_apsis: hasApsis,
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
    <form className="mx-auto flex max-w-[520px] flex-col gap-4 px-6 pt-7 pb-12 sm:px-12" onSubmit={onSubmit}>
      <Field label="Kyrkans namn (valfritt)">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="T.ex. Lunds Domkyrka"
          className={fieldInputClass}
        />
      </Field>

      <Checkbox
        label="Kyrkan har en absid"
        checked={hasApsis}
        onChange={(event) => setHasApsis(event.target.checked)}
      />

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

      <Button type="submit" className="w-fit whitespace-nowrap" disabled={submitting}>
        {submitting ? "Laddar upp..." : "Ladda upp"}
      </Button>
    </form>
  );
}
