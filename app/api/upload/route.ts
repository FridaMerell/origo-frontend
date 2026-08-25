import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getSessionCookies } from "@/app/lib/session";

const ALLOWED_FOLDERS = ["verso", "flux"];

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
    const blob = await put(`${folder}/${file.name}`, file, {
      access: "private",
      addRandomSuffix: true,
    });

    return NextResponse.json(blob);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
