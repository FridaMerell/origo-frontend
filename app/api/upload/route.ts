import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { getCurrentUser, getTempusObservationItem } from "@/app/lib/dal";
import { getSessionCookies } from "@/app/lib/session";
import { STORAGE_BUCKET, STORAGE_ENDPOINT, storage, storageUrlForKey } from "@/app/lib/storage";

const ALLOWED_FOLDERS = ["verso", "flux", "apsis", "opus"];

// The browser compresses Tempus photos to at most this before uploading.
const TEMPUS_MAX_BYTES = 3 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Tempus photos go in the observation's own folder, tempus/<user>/<taxon>/<observation>.
// The path comes from the observation itself, never from what the client sends.
async function tempusFolder(observationId: FormDataEntryValue | null): Promise<string | null> {
  if (typeof observationId !== "string" || !UUID_PATTERN.test(observationId)) return null;
  const [user, observation] = await Promise.all([getCurrentUser(), getTempusObservationItem(observationId)]);
  if (!user || !observation || observation.user !== user.id) return null;
  return `tempus/${user.id}/${observation.species_detail.dyntaxa_taxon_id}/${observation.id}`;
}

// Same shape as the old random suffix: "report.pdf" -> "report-<uuid>.pdf".
function uniqueKey(folder: string, fileName: string): string {
  const safeName = fileName.split(/[\\/]/).pop() || "file";
  const dot = safeName.lastIndexOf(".");
  const base = dot > 0 ? safeName.slice(0, dot) : safeName;
  const ext = dot > 0 ? safeName.slice(dot) : "";
  return `${folder}/${base}-${crypto.randomUUID()}${ext}`;
}

export async function POST(request: Request): Promise<NextResponse> {
  const { sessionId } = await getSessionCookies();
  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  // One or more "file" entries; every file goes to the same folder.
  const files = formData.getAll("file");
  const folder = formData.get("folder");

  if (files.length === 0 || !files.every((file): file is File => file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  let target: string | null = null;
  if (folder === "tempus") {
    // Tempus shows these messages to the user as they are.
    if (files.length % 2 !== 0) {
      return NextResponse.json({ error: "Varje bild måste skickas med sin miniatyr." }, { status: 400 });
    }
    if (files.some((file) => !file.type.startsWith("image/") || file.size > TEMPUS_MAX_BYTES)) {
      return NextResponse.json({ error: "Bara bilder på högst 3 MB kan laddas upp." }, { status: 400 });
    }
    target = await tempusFolder(formData.get("observation"));
    if (!target) {
      return NextResponse.json({ error: "Observationen finns inte eller är inte din." }, { status: 403 });
    }
  } else if (typeof folder === "string" && ALLOWED_FOLDERS.includes(folder)) {
    target = folder;
  }
  if (!target) {
    return NextResponse.json({ error: "Invalid upload folder" }, { status: 400 });
  }
  // Tempus files come in pairs: a photo, then its thumbnail. The thumbnail is
  // stored beside the photo with "-thumb" before the extension, so Django only
  // keeps the photo's path.
  const keys: string[] = [];
  for (const [index, file] of files.entries()) {
    keys.push(
      folder === "tempus" && index % 2 === 1
        ? keys[index - 1].replace(/(\.[^./]+)?$/, "-thumb$1")
        : uniqueKey(target, file.name)
    );
  }

  try {
    const uploaded = await Promise.all(files.map(async (file, index) => {
      const key = keys[index];
      await storage.send(
        new PutObjectCommand({
          Bucket: STORAGE_BUCKET,
          Key: key,
          Body: new Uint8Array(await file.arrayBuffer()),
          ContentType: file.type || "application/octet-stream",
          ContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        })
      );
      return { url: storageUrlForKey(key), pathname: key };
    }));

    // `url`/`pathname` describe the first file, for callers that send one.
    return NextResponse.json({ ...uploaded[0], files: uploaded });
  } catch (error) {
    console.error("Upload to R2 failed:", error, "endpoint:", STORAGE_ENDPOINT, "bucket:", STORAGE_BUCKET);
    return NextResponse.json(
      { error: folder === "tempus" ? "Lagringen svarade inte. Försök igen." : (error as Error).message },
      { status: 400 }
    );
  }
}
