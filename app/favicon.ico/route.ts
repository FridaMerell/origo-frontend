import { readFile } from "node:fs/promises";
import path from "node:path";

// Browsers that ignore <link rel="icon">, or that already cached a failed
// request, ask for /favicon.ico. Serve the same ammonite as app/icon.png.
export async function GET() {
  const png = await readFile(path.join(process.cwd(), "app", "icon.png"));
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
