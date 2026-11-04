/** The access token lives in memory only: never in localStorage or a cookie
 * the page can read. A page reload gets a new one from the refresh cookie
 * (see refresh.ts). */
let accessToken: string | null = null;
const lostListeners = new Set<() => void>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Called when the server says the session is over (refresh refused). */
export function onSessionLost(listener: () => void): () => void {
  lostListeners.add(listener);
  return () => {
    lostListeners.delete(listener);
  };
}

export function notifySessionLost(): void {
  accessToken = null;
  lostListeners.forEach((listener) => listener());
}
