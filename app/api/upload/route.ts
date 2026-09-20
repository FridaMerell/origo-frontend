import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { getSessionCookies } from "@/app/lib/session";
import { STORAGE_BUCKET, STORAGE_ENDPOINT, storage, storageUrlForKey } from "@/app/lib/storage";

const ALLOWED_FOLDERS = ["verso", "flux", "apsis"];

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
  const file = formData.get("file");
  const folder = formData.get("folder");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (typeof folder !== "string" || !ALLOWED_FOLDERS.includes(folder)) {
    return NextResponse.json({ error: "Invalid upload folder" }, { status: 400 });
  }

  try {
    const key = uniqueKey(folder, file.name);
    await storage.send(
      new PutObjectCommand({
        Bucket: STORAGE_BUCKET,
        Key: key,
        Body: new Uint8Array(await file.arrayBuffer()),
        ContentType: file.type || "application/octet-stream",
        ContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      })
    );

    return NextResponse.json({ url: storageUrlForKey(key), pathname: key });
  } catch (error) {
    console.error("Upload to R2 failed:", error, "endpoint:", STORAGE_ENDPOINT, "bucket:", STORAGE_BUCKET);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
