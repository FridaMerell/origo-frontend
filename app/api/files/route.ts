import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getSessionCookies } from "@/app/lib/session";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "No url provided" }, { status: 400 });
  }

  // Apsis posts are public; their files live under the "apsis/" blob prefix
  // (see app/api/upload/route.ts) and are readable without a session. Every
  // other tenant's files stay gated behind a session.
  const isApsisFile = new URL(url).pathname.startsWith("/apsis/");

  const { sessionId } = await getSessionCookies();
  if (!sessionId && !isApsisFile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await get(url, { access: "private" });
    if (!result || result.statusCode !== 200) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType,
        "Content-Disposition": result.blob.contentDisposition,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
