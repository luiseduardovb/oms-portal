/// <reference types="google.maps" />

/** Loads the Google Maps JavaScript API once, in the browser. The key is a
 * browser key restricted to this site's addresses, so it is not a secret. */

export const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";
/** `DEMO_MAP_ID` works for development; a real map ID carries our style. */
export const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID";

/** Tegucigalpa, where the map opens when a branch has no pin yet. */
export const DEFAULT_CENTER = { lat: 14.0723, lng: -87.1921 };

export type MapsFailure = "no_key" | "load" | "auth";

type Listener = (failure: MapsFailure) => void;
const listeners = new Set<Listener>();
let loading: Promise<typeof google.maps> | null = null;

declare global {
  interface Window {
    gm_authFailure?: () => void;
    __omsMapsReady?: () => void;
  }
}

/** Called when Google refuses the key (wrong site address, API off). */
export function onMapsAuthFailure(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (!MAPS_KEY) return Promise.reject(new Error("no_key"));
  if (typeof window === "undefined") return Promise.reject(new Error("load"));
  const loaded = (
    window as unknown as { google?: { maps?: { importLibrary?: unknown } } }
  ).google;
  if (loaded?.maps?.importLibrary) return Promise.resolve(google.maps);
  loading ??= new Promise((resolve, reject) => {
    window.gm_authFailure = () => listeners.forEach((l) => l("auth"));
    window.__omsMapsReady = () => resolve(google.maps);
    const script = document.createElement("script");
    script.src =
      "https://maps.googleapis.com/maps/api/js?" +
      new URLSearchParams({
        key: MAPS_KEY,
        v: "weekly",
        loading: "async",
        language: "es",
        region: "HN",
        callback: "__omsMapsReady",
      }).toString();
    script.async = true;
    script.onerror = () => {
      loading = null;
      reject(new Error("load"));
    };
    document.head.append(script);
  });
  return loading;
}
