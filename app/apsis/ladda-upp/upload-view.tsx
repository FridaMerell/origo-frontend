"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/Button";
import { Icon } from "@/app/components/ui/Icon";
import { FileUpload } from "@/app/components/ui/FileUpload";
import { useUploadedFiles } from "@/app/components/form/useUploadedFiles";
import { useUser } from "@/app/lib/user-context";
import { createApsisPost } from "@/app/actions/apsis";

export default function UploadView() {
  const user = useUser();
  const router = useRouter();

  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const uploadedFiles = useUploadedFiles();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return (
      <div className="mx-auto flex max-w-[420px] flex-col items-center gap-4 px-6 pt-16 pb-12 text-center sm:px-12">
        <Icon name="lock" size={26} className="text-text-muted" />
        <p className="text-sm text-text-muted">
          Logga in för att lägga till egna absidfoton i samlingen.
        </p>
        <Button className="whitespace-nowrap" onClick={() => router.push("/login")}>
          Logga in
        </Button>
      </div>
    );
  }

  // Stub: fills fixed coordinates. Swap for the browser Geolocation API
  // (reverse-geocode to a place name) when that work lands.
  const getLocation = () => {
    if (!navigator.geolocation) {
      setPlace("55.7047° N, 13.1910° E");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setPlace(`${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E`),
      () => setPlace("55.7047° N, 13.1910° E"),
    );
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (uploadedFiles.files.length === 0) {
      setError("Välj en bild att ladda upp.");
      return;
    }
    setSubmitting(true);
    const result = await createApsisPost(
      { name, geolocation: place },
      uploadedFiles.files.map((file) => ({ name: file.name, url: file.url })),
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
      <label className="flex flex-col gap-1 text-sm">
        Kyrkans namn (valfritt)
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="T.ex. Lunds Domkyrka"
          className="rounded border border-field-border bg-surface px-3 py-2 text-text"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Plats (valfritt)
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={place}
            placeholder="Hämtad plats visas här"
            className="flex-1 rounded border border-field-border bg-surface-2 px-3 py-2 text-text"
          />
          <Button type="button" variant="secondary" className="whitespace-nowrap" onClick={getLocation}>
            <Icon name="map-pin" size={15} />
            Hämta plats
          </Button>
        </div>
      </label>

      <div className="flex flex-col gap-1 text-sm">
        Bild
        <FileUpload folder="apsis" files={uploadedFiles.files} onChange={uploadedFiles.setFiles} multiple={false} accept="image/*" />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" className="w-fit whitespace-nowrap" disabled={submitting}>
        {submitting ? "Laddar upp..." : "Ladda upp"}
      </Button>
    </form>
  );
}
