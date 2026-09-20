import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { getSessionCookies } from "@/app/lib/session";
import { STORAGE_BUCKET, storage, storageKeyFromUrl } from "@/app/lib/storage";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "No url provided" }, { status: 400 });
  }

  const key = storageKeyFromUrl(url);
  if (!key) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Apsis posts are public; their files live under the "apsis/" key prefix
  // (see app/api/upload/route.ts) and are readable without a session. Every
  // other tenant's files stay gated behind a session.
  const isApsisFile = key.startsWith("apsis/");

  const { sessionId } = await getSessionCookies();
  if (!sessionId && !isApsisFile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await storage.send(
      new GetObjectCommand({ Bucket: STORAGE_BUCKET, Key: key })
    );
    if (!result.Body) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const headers: Record<string, string> = {
      "Content-Type": result.ContentType ?? "application/octet-stream",
    };
    if (result.ContentDisposition) headers["Content-Disposition"] = result.ContentDisposition;

    return new NextResponse(result.Body.transformToWebStream(), { headers });
  } catch (error) {
    if ((error as { name?: string }).name === "NoSuchKey") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
