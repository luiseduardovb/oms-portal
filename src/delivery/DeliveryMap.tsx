"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { useTheme } from "@mui/material/styles";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_CENTER,
  MAP_ID,
  loadGoogleMaps,
  onMapsAuthFailure,
  type MapsFailure,
} from "./googleMaps";
import {
  shapeRing,
  type Point,
  type Shape,
  type ShapeAction,
} from "./zoneShape";

export interface MapZone {
  id: number;
  name: string;
  ring: Point[];
  active: boolean;
  highlighted?: boolean;
}

export interface LatLng {
  lat: number;
  lng: number;
}

interface Props {
  center?: LatLng | null;
  /** The branch itself. */
  outlet?: LatLng | null;
  zones?: MapZone[];
  /** The shape being drawn; send changes to ``dispatch``. */
  shape?: Shape;
  dispatch?: (action: ShapeAction) => void;
  /** A point being tested, and what to do when the map is clicked to test. */
  probe?: LatLng | null;
  /** Where an order goes; the map opens close on it. */
  pin?: LatLng | null;
  zoom?: number;
  onProbe?: (point: LatLng) => void;
  height?: number | string;
}

const toPath = (ring: Point[]) => ring.map(([lng, lat]) => ({ lat, lng }));

/** A marker's position is a LatLng or a literal, depending on how it was set. */
function coords(
  position: google.maps.LatLng | google.maps.LatLngLiteral | null | undefined,
): Point | null {
  if (!position) return null;
  const p = position as {
    lat: number | (() => number);
    lng: number | (() => number);
  };
  const value = (v: number | (() => number)) =>
    typeof v === "function" ? v() : Number(v);
  return [value(p.lng), value(p.lat)];
}

function dot(color: string, size: number, filled = true): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText =
    `width:${size}px;height:${size}px;border-radius:50%;` +
    `background:${filled ? color : "#fff"};border:2px solid ${color};` +
    "box-shadow:0 1px 3px rgba(0,0,0,.4);cursor:pointer;";
  return el;
}

/** A Google map that shows a branch, its zones and the zone being drawn.
 * Drawing is ours: a click adds a point, the first point closes the shape,
 * and every point can be dragged. */
export function DeliveryMap({
  center,
  outlet,
  zones = [],
  shape,
  dispatch,
  probe,
  pin,
  zoom = 13,
  onProbe,
  height = 420,
}: Props) {
  const t = useTranslations("delivery.map");
  const theme = useTheme();
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const overlays = useRef<(() => void)[]>([]);
  const [failure, setFailure] = useState<MapsFailure | null>(null);
  const [ready, setReady] = useState(false);
  const latest = useRef({ shape, dispatch, onProbe });
  useEffect(() => {
    latest.current = { shape, dispatch, onProbe };
  });
  const primary = theme.palette.primary.main;
  const muted = theme.palette.grey[500];
  const accent = theme.palette.secondary.main;

  useEffect(() => onMapsAuthFailure(setFailure), []);

  useEffect(() => {
    let live = true;
    loadGoogleMaps()
      .then(async (maps) => {
        if (!live || !host.current) return;
        await maps.importLibrary("marker");
        const { Map } = (await maps.importLibrary(
          "maps",
        )) as google.maps.MapsLibrary;
        map.current = new Map(host.current, {
          center: center ?? DEFAULT_CENTER,
          zoom,
          mapId: MAP_ID,
          clickableIcons: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        });
        map.current.addListener("click", (event: google.maps.MapMouseEvent) => {
          const at = event.latLng;
          if (!at) return;
          const { shape: s, dispatch: d, onProbe: p } = latest.current;
          if (s && d) {
            if (s.kind === "polygon" && !s.closed) {
              d({ type: "add", point: [at.lng(), at.lat()] });
            } else if (s.kind === "circle") {
              d({ type: "center", point: [at.lng(), at.lat()] });
            }
          } else if (p) {
            p({ lat: at.lat(), lng: at.lng() });
          }
        });
        setReady(true);
      })
      .catch(
        (error: Error) =>
          live && setFailure(error.message === "no_key" ? "no_key" : "load"),
      );
    return () => {
      live = false;
    };
    // The map is made once; what it shows is kept in sync below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter when the branch (or a searched place) changes.
  useEffect(() => {
    if (ready && center && map.current) map.current.panTo(center);
  }, [ready, center?.lat, center?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    overlays.current.forEach((remove) => remove());
    overlays.current = [];
    const keep = <T extends google.maps.Polygon | google.maps.Polyline>(
      item: T,
    ): T => {
      overlays.current.push(() => item.setMap(null));
      return item;
    };
    const keepMarker = (
      item: google.maps.marker.AdvancedMarkerElement,
    ): google.maps.marker.AdvancedMarkerElement => {
      overlays.current.push(() => {
        item.map = null;
      });
      return item;
    };

    for (const zone of zones) {
      const color = zone.active ? primary : muted;
      keep(
        new google.maps.Polygon({
          map: m,
          paths: toPath(zone.ring),
          strokeColor: color,
          strokeWeight: zone.highlighted ? 3 : 2,
          fillColor: color,
          fillOpacity: zone.active ? (zone.highlighted ? 0.3 : 0.15) : 0.06,
          clickable: false,
        }),
      );
    }

    if (outlet) {
      keepMarker(
        new google.maps.marker.AdvancedMarkerElement({
          map: m,
          position: outlet,
          title: t("outlet"),
          content: dot(accent, 18),
        }),
      );
    }

    if (pin) {
      keepMarker(
        new google.maps.marker.AdvancedMarkerElement({
          map: m,
          position: pin,
          title: t("pin"),
        }),
      );
    }

    if (probe) {
      keepMarker(
        new google.maps.marker.AdvancedMarkerElement({
          map: m,
          position: probe,
          title: t("probe"),
        }),
      );
    }

    if (shape && dispatch) {
      const ring = shapeRing(shape);
      const path = toPath(ring);
      if (shape.kind === "polygon" && !shape.closed && path.length > 1) {
        keep(
          new google.maps.Polyline({
            map: m,
            path,
            strokeColor: primary,
            strokeWeight: 2,
            clickable: false,
          }),
        );
      } else if (path.length > 2) {
        keep(
          new google.maps.Polygon({
            map: m,
            paths: path,
            strokeColor: primary,
            strokeWeight: 3,
            fillColor: primary,
            fillOpacity: 0.3,
            clickable: false,
          }),
        );
      }
      if (shape.kind === "polygon") {
        shape.points.forEach(([lng, lat], index) => {
          const marker = keepMarker(
            new google.maps.marker.AdvancedMarkerElement({
              map: m,
              position: { lat, lng },
              gmpDraggable: true,
              content: dot(primary, index === 0 ? 16 : 12, index !== 0),
              title: index === 0 && !shape.closed ? t("closeShape") : undefined,
            }),
          );
          marker.addListener("dragend", () => {
            const at = coords(marker.position);
            if (at) dispatch({ type: "move", index, point: at });
          });
          if (index === 0 && !shape.closed && shape.points.length >= 3) {
            marker.addListener("click", () => dispatch({ type: "close" }));
          }
        });
      } else if (shape.kind === "circle" && shape.center) {
        const [lng, lat] = shape.center;
        const marker = keepMarker(
          new google.maps.marker.AdvancedMarkerElement({
            map: m,
            position: { lat, lng },
            gmpDraggable: true,
            content: dot(primary, 14),
          }),
        );
        marker.addListener("dragend", () => {
          const at = coords(marker.position);
          if (at) dispatch({ type: "center", point: at });
        });
      }
    }
  }, [
    ready,
    zones,
    outlet,
    probe,
    pin,
    shape,
    dispatch,
    primary,
    muted,
    accent,
    t,
  ]);

  if (failure) {
    return (
      <Alert severity="error" sx={{ height: "fit-content" }}>
        {t(`failure.${failure}`)}
      </Alert>
    );
  }
  return (
    <Box
      sx={{ position: "relative", height, borderRadius: 1, overflow: "hidden" }}
    >
      <Box ref={host} sx={{ position: "absolute", inset: 0 }} />
      {!ready && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            bgcolor: "action.hover",
          }}
        >
          <CircularProgress aria-label={t("loading")} />
        </Box>
      )}
    </Box>
  );
}
