"use server";

import { AUTH_ENDPOINTS } from "@/app/lib/config";
import { buildCookieHeader, extractSetCookie, fetchOrigoApi } from "@/app/lib/api-client";
import { clearSessionCookies, getSessionCookies, setSessionCookies } from "@/app/lib/session";
import { loginFormSchema, type LoginFormValues } from "@/app/lib/schemas";

export type LoginState = { error?: string; success?: true } | undefined;

export async function login(data: LoginFormValues): Promise<LoginState> {
  const parsed = loginFormSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Username and password are required." };
  }
  const { username, password } = parsed.data;

  const csrfResponse = await fetchOrigoApi(AUTH_ENDPOINTS.csrf);
  const csrfToken = extractSetCookie(csrfResponse, "csrftoken");
  if (!csrfToken) {
    return { error: "Could not reach the server. Please try again." };
  }

  const loginResponse = await fetchOrigoApi(AUTH_ENDPOINTS.login, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
      Cookie: buildCookieHeader({ csrftoken: csrfToken }),
    },
    body: JSON.stringify({ username, password }),
  });

  if (!loginResponse.ok) {
    return { error: "Invalid username or password." };
  }

  const sessionId = extractSetCookie(loginResponse, "sessionid");
  const rotatedCsrfToken = extractSetCookie(loginResponse, "csrftoken") ?? csrfToken;
  if (!sessionId) {
    return { error: "Login failed. Please try again." };
  }

  await setSessionCookies(sessionId, rotatedCsrfToken);
  return { success: true };
}

export async function logout() {
  const { sessionId, csrfToken } = await getSessionCookies();

  if (sessionId) {
    await fetchOrigoApi(AUTH_ENDPOINTS.logout, {
      method: "POST",
      headers: {
        "X-CSRFToken": csrfToken ?? "",
        Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
      },
    });
  }

  await clearSessionCookies();
}
