"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/Button";
import { Modal } from "@/app/components/ui/Modal";
import { FileUpload } from "@/app/components/ui/FileUpload";
import { useConfirmDialog } from "@/app/components/ui/useConfirmDialog";
import { Checkbox, Field, TextArea, fieldInputClass } from "@/app/components/form/Field";
import { useUploadedFiles } from "@/app/components/form/useUploadedFiles";
import { deleteApsisPost, getApsisPlace, updateApsisPost } from "@/app/actions/apsis";
import { ChurchPicker, churchDetail } from "@/app/apsis/ui/church-picker";
import { fileProxyUrl } from "@/app/lib/files";
import type { ApsisPlace, ApsisPost } from "@/app/lib/dal";
import { PlacePicker } from "@/app/tempus/observationer/quick-observation/place-picker";
import { parseLatLon } from "@/app/tempus/formatters";

const FORM_ID = "apsis-edit-post-form";

type ConnectedChurch = { id: string; name: string; detail?: string };

// Posts store their position as "lat, lon"; older ones may hold free text.
function splitGeolocation(geolocation: string): [string, string] {
  const match = geolocation.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  return match ? [match[1], match[2]] : ["", ""];
}

/** Edit or delete one Apsis post. Mount it only while a post is being edited. */
export function EditPostModal({
  post,
  onClose,
  onDeleted,
}: {
  post: ApsisPost;
  onClose: () => void;
  /** Where to go once the post is gone; defaults to refreshing the current page. */
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [initialLat, initialLon] = splitGeolocation(post.geolocation);

  const [name, setName] = useState(post.name);
  const [content, setContent] = useState(post.content === post.name ? "" : post.content);
  const [hasApsis, setHasApsis] = useState(post.has_apsis);
  const [lat, setLat] = useState(initialLat);
  const [lon, setLon] = useState(initialLon);
  const [positionChanged, setPositionChanged] = useState(false);
  const [church, setChurch] = useState<ConnectedChurch | null>(
    post.svenska_kyrkan_place_id ? { id: post.svenska_kyrkan_place_id, name: "Hämtar kyrka…" } : null,
  );
  const newImage = useUploadedFiles();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { requestConfirm, dialog } = useConfirmDialog();

  useEffect(() => {
    const id = post.svenska_kyrkan_place_id;
    if (!id) return;
    let cancelled = false;
    getApsisPlace(id).then((place) => {
      if (cancelled) return;
      setChurch((current) =>
        current?.id !== id
          ? current
          : place
            ? { id, name: place.name, detail: churchDetail(place) }
            : { id, name: post.name || "Kopplad kyrka", detail: "Uppgifterna från Svenska kyrkan kunde inte hämtas." },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [post.svenska_kyrkan_place_id]);

  const selectChurch = (place: ApsisPlace) => {
    setChurch({ id: place.id, name: place.name, detail: churchDetail(place) });
    setName(place.name);
    if (place.latitude !== null && place.longitude !== null) {
      setLat(place.latitude.toFixed(6));
      setLon(place.longitude.toFixed(6));
      setPositionChanged(true);
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const coordinates = parseLatLon(lat, lon);
    if ("error" in coordinates) {
      setError(coordinates.error);
      return;
    }
    const hasCoordinates = coordinates.lat !== null && coordinates.lon !== null;
    setSaving(true);
    const result = await updateApsisPost(post.id, {
      name,
      content,
      has_apsis: hasApsis,
      svenska_kyrkan_place_id: church?.id ?? "",
      // An untouched position keeps whatever the post already holds.
      geolocation: !positionChanged
        ? post.geolocation
        : hasCoordinates
          ? `${coordinates.lat!.toFixed(6)}, ${coordinates.lon!.toFixed(6)}`
          : "",
      files: newImage.files.flatMap((file) =>
        file.thumbnailUrl
          ? [
              { name: `${file.name} (miniatyr)`, url: file.thumbnailUrl },
              { name: file.name, url: file.url },
            ]
          : [{ name: file.name, url: file.url }],
      ),
    });
    setSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    onClose();
    router.refresh();
  };

  const remove = () =>
    requestConfirm({
      title: "Ta bort inlägget?",
      message: `${post.name || "Inlägget"} tas bort för alla. Det går inte att ångra.`,
      confirmLabel: "Ta bort",
      destructive: true,
      onConfirm: async () => {
        setSaving(true);
        const result = await deleteApsisPost(post.id);
        setSaving(false);
        if (result?.error) {
          setError(result.error);
          return;
        }
        onClose();
        if (onDeleted) onDeleted();
        else router.refresh();
      },
    });

  const currentImage = post.files?.[0];

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Redigera inlägg"
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" className="text-danger" disabled={saving} onClick={remove}>
            Ta bort
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" form={FORM_ID} size="sm" disabled={saving}>
              {saving ? "Sparar..." : "Spara"}
            </Button>
          </div>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} className="grid gap-6 md:grid-cols-[14rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          {currentImage && newImage.files.length === 0 && (
            <Image
              src={fileProxyUrl(currentImage.url)}
              alt={post.name || "Kyrkoabsid"}
              width={440}
              height={440}
              sizes="14rem"
              className="h-auto w-full"
            />
          )}
          <div className="flex flex-col gap-1 text-sm text-text-muted">
            Byt bild
            <FileUpload
              folder="apsis"
              files={newImage.files}
              onChange={newImage.setFiles}
              multiple={false}
              accept="image/*"
              thumbnailOptions={{ maxEdge: 1024, quality: 0.78 }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <ChurchPicker
            selected={church ? { name: church.name, detail: church.detail } : null}
            onSelect={selectChurch}
            onClear={() => setChurch(null)}
          />

          {/* Name and position come from the chosen church; they are only typed
              by hand for a church Svenska kyrkan does not list. */}
          {!church && (
            <>
              <Field label="Kyrkans namn">
                <input type="text" value={name} onChange={(event) => setName(event.target.value)} className={fieldInputClass} />
              </Field>

              <PlacePicker
                lat={lat}
                lon={lon}
                legend="Plats"
                onChange={({ lat: nextLat, lon: nextLon }) => {
                  setLat(nextLat);
                  setLon(nextLon);
                  setPositionChanged(true);
                }}
                onClearError={() => setError(null)}
                onError={setError}
              />
            </>
          )}

          <Field label="Egen kommentar">
            <TextArea value={content} onChange={(event) => setContent(event.target.value)} />
          </Field>

          <Checkbox label="Kyrkan har en absid" checked={hasApsis} onChange={(event) => setHasApsis(event.target.checked)} />

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </form>
      {dialog}
    </Modal>
  );
}
