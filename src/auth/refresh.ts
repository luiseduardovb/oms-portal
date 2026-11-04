import axios, { isAxiosError } from "axios";
import type { components } from "@/api/generated/schema";
import { notifySessionLost, setAccessToken } from "./tokenStore";

export type TokenResponse = components["schemas"]["TokenResponse"];

/** The API asks for this header on refresh and logout (CSRF guard). */
export const CSRF_HEADERS = { "X-Requested-With": "oms-portal" };

/** Plain axios instance: no interceptors, so a refresh can never trigger
 * another refresh. */
export const refreshHttp = axios.create({
  baseURL: "/api",
  headers: { Accept: "application/json" },
});

let inflight: Promise<TokenResponse | null> | null = null;

async function requestRefresh(): Promise<TokenResponse | null> {
  try {
    const { data } = await refreshHttp.post<TokenResponse>(
      "/auth/refresh",
      null,
      { headers: CSRF_HEADERS },
    );
    setAccessToken(data.accessToken);
    return data;
  } catch (error) {
    // Only a refusal ends the session; a network blip does not.
    if (isAxiosError(error) && error.response?.status === 401) {
      notifySessionLost();
    }
    return null;
  }
}

/** Ask for a new access token with the refresh cookie. Calls that overlap
 * share one request, because each refresh rotates the cookie. */
export function refreshSession(): Promise<TokenResponse | null> {
  inflight ??= requestRefresh().finally(() => {
    inflight = null;
  });
  return inflight;
}
