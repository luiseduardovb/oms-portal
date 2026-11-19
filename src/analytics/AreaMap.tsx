"use client";

import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import { useEffect, useRef } from "react";
import {
  DEFAULT_CENTER,
  MAP_ID,
  MAPS_KEY,
  loadGoogleMaps,
} from "@/delivery/googleMaps";
import type { MapCell } from "./analyticsApi";

/** Four steps of how an area sold against the best one: 0-25, 26-50,
 * 51-75 and 76-100 percent. */
export function level(share: number): 0 | 1 | 2 | 3 {
  if (share > 75) return 3;
  if (share > 50) return 2;
  if (share > 25) return 1;
  return 0;
}

export const LEVEL_OPACITY = [0.25, 0.4, 0.6, 0.85];

/** Circles over the squares (about a kilometre) where delivery orders went, darker where sales are higher. It
 * draws nothing when the map key is not set. */
export function AreaMap({ areas }: { areas: MapCell[] }) {
  const theme = useTheme();
  const host = useRef<HTMLDivElement>(null);
  const color = theme.palette.primary.main;
  useEffect(() => {
    if (!MAPS_KEY) return;
    let live = true;
    const circles: google.maps.Circle[] = [];
    loadGoogleMaps()
      .then(async (maps) => {
        if (!live || !host.current) return;
        const { Map } = (await maps.importLibrary(
          "maps",
        )) as google.maps.MapsLibrary;
        const placed = areas;
        const map = new Map(host.current, {
          center: placed[0]
            ? { lat: placed[0].lat, lng: placed[0].lng }
            : DEFAULT_CENTER,
          zoom: 12,
          mapId: MAP_ID,
          streetViewControl: false,
          mapTypeControl: false,
        });
        const best = Math.max(...placed.map((a) => Number(a.sales)), 0);
        const bounds = new maps.LatLngBounds();
        for (const a of placed) {
          const share = best ? (Number(a.sales) / best) * 100 : 0;
          const center = { lat: a.lat, lng: a.lng };
          circles.push(
            new maps.Circle({
              map,
              center,
              radius: 600,
              strokeColor: color,
              strokeWeight: 1,
              fillColor: color,
              fillOpacity: LEVEL_OPACITY[level(share)],
            }),
          );
          bounds.extend(center);
        }
        if (placed.length > 1) map.fitBounds(bounds, 48);
      })
      .catch(() => undefined);
    return () => {
      live = false;
      circles.forEach((c) => c.setMap(null));
    };
  }, [areas, color]);
  if (!MAPS_KEY) return null;
  return <Box ref={host} sx={{ height: 320, borderRadius: 2 }} />;
}
