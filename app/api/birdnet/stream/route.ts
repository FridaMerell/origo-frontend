import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client";
import { BIRDNET_ENDPOINTS } from "@/app/lib/config";
import { getSessionCookies } from "@/app/lib/session";

// Proxies the BirdNET Server-Sent Events stream so the browser can open it
// same-origin with EventSource. The session cookie is attached here, server
// side — EventSource cannot set headers and the API lives on another host.
export async function GET(request: Request): Promise<Response> {
  const { sessionId, csrfToken } = await getSessionCookies();
  if (!sessionId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const replaySeconds = new URL(request.url).searchParams.get("replay_seconds");
  const lastEventId = request.headers.get("last-event-id");

  const query = replaySeconds
    ? `?replay_seconds=${encodeURIComponent(replaySeconds)}`
    : "";

  const headers: Record<string, string> = {
    Accept: "text/event-stream",
    Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
  };
  if (lastEventId) headers["Last-Event-ID"] = lastEventId;

  let upstream: Response;
  try {
    upstream = await fetchOrigoApi(`${BIRDNET_ENDPOINTS.detectionStream}${query}`, {
      headers,
      cache: "no-store",
      // Forward client disconnects so the backend releases its worker + DB
      // connection instead of holding a dead stream open.
      signal: request.signal,
    });
  } catch {
    return new Response("BirdNET-strömmen kunde inte nås.", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response("BirdNET-strömmen svarade med ett fel.", {
      status: upstream.status === 200 ? 502 : upstream.status,
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Stop any intermediate proxy (nginx) from buffering the stream.
      "X-Accel-Buffering": "no",
    },
  });
}
