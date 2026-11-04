import axios, { isAxiosError, type InternalAxiosRequestConfig } from "axios";
import { refreshSession } from "@/auth/refresh";
import { getAccessToken, setAccessToken } from "@/auth/tokenStore";

/** All API calls go through this server's /api proxy (see next.config.ts). */
export const http = axios.create({
  baseURL: "/api",
  headers: { Accept: "application/json" },
});

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && !config.headers.has("Authorization")) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

interface Retryable extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

const RETRY_CODES = new Set(["auth.token_expired", "auth.invalid_token"]);

function errorCode(data: unknown): string | undefined {
  if (typeof data !== "object" || data === null) return undefined;
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail !== "object" || detail === null) return undefined;
  const code = (detail as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

// An expired access token is renewed once, then the request is repeated.
// Calls to /auth/* are never repeated: their 401 is the answer.
http.interceptors.response.use(undefined, async (error: unknown) => {
  if (!isAxiosError(error) || !error.config) throw error;
  const config = error.config as Retryable;
  const code = errorCode(error.response?.data);
  if (
    error.response?.status !== 401 ||
    config._retried ||
    !code ||
    !RETRY_CODES.has(code) ||
    config.url?.startsWith("/auth/")
  ) {
    throw error;
  }
  config._retried = true;
  const renewed = await refreshSession();
  if (!renewed) throw error;
  setAccessToken(renewed.accessToken);
  config.headers.set("Authorization", `Bearer ${renewed.accessToken}`);
  return http.request(config);
});
