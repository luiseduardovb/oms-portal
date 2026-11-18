import type { components } from "@/api/generated/schema";

type ZoneIn = components["schemas"]["ZoneIn"];

/** A point as the API keeps it: [longitude, latitude]. */
export type Point = [number, number];

export const MIN_RADIUS = 100;
export const MAX_RADIUS = 50_000;
export const MAX_POINTS = 500;
const EARTH_RADIUS = 6_371_008.8;

/** What the merchant has drawn so far. */
export type Shape =
  | { kind: "none" }
  | { kind: "polygon"; points: Point[]; closed: boolean }
  | { kind: "circle"; center: Point | null; radius: number };

export const NO_SHAPE: Shape = { kind: "none" };

export type ShapeAction =
  | { type: "polygon" }
  | { type: "circle"; radius?: number }
  | { type: "load"; ring: Point[] }
  | { type: "add"; point: Point }
  | { type: "close" }
  | { type: "move"; index: number; point: Point }
  | { type: "undo" }
  | { type: "clear" }
  | { type: "center"; point: Point }
  | { type: "radius"; radius: number };

export function shapeReducer(shape: Shape, action: ShapeAction): Shape {
  switch (action.type) {
    case "polygon":
      return { kind: "polygon", points: [], closed: false };
    case "circle":
      return {
        kind: "circle",
        center: null,
        radius: action.radius ?? 2000,
      };
    case "load": {
      const points = action.ring.slice();
      const first = points[0];
      const last = points[points.length - 1];
      if (points.length > 1 && first && last && same(first, last)) {
        points.pop();
      }
      return { kind: "polygon", points, closed: true };
    }
    case "add":
      if (
        shape.kind === "polygon" &&
        !shape.closed &&
        shape.points.length < MAX_POINTS
      ) {
        return { ...shape, points: [...shape.points, action.point] };
      }
      return shape;
    case "close":
      return shape.kind === "polygon" && shape.points.length >= 3
        ? { ...shape, closed: true }
        : shape;
    case "move":
      if (shape.kind === "polygon") {
        return {
          ...shape,
          points: shape.points.map((p, i) =>
            i === action.index ? action.point : p,
          ),
        };
      }
      return shape;
    case "undo":
      if (shape.kind === "polygon" && shape.points.length > 0) {
        return {
          kind: "polygon",
          points: shape.points.slice(0, -1),
          closed: false,
        };
      }
      return shape;
    case "clear":
      return shape.kind === "circle"
        ? { ...shape, center: null }
        : shape.kind === "polygon"
          ? { kind: "polygon", points: [], closed: false }
          : shape;
    case "center":
      return shape.kind === "circle"
        ? { ...shape, center: action.point }
        : shape;
    case "radius":
      return shape.kind === "circle"
        ? { ...shape, radius: action.radius }
        : shape;
  }
}

function same(a: Point, b: Point): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/** A closed ring around a point, like the API's own circle helper. */
export function circleRing(center: Point, radius: number, steps = 48): Point[] {
  const [lng, lat] = center;
  const dLat = ((radius / EARTH_RADIUS) * 180) / Math.PI;
  const dLng = dLat / Math.max(Math.cos((lat * Math.PI) / 180), 0.01);
  const ring: Point[] = [];
  for (let i = 0; i < steps; i += 1) {
    const angle = (2 * Math.PI * i) / steps;
    ring.push([
      Number((lng + dLng * Math.sin(angle)).toFixed(6)),
      Number((lat + dLat * Math.cos(angle)).toFixed(6)),
    ]);
  }
  ring.push([...ring[0]!] as Point);
  return ring;
}

function cross(o: Point, a: Point, b: Point): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function crosses(a: Point, b: Point, c: Point, d: Point): boolean {
  return (
    cross(c, d, a) * cross(c, d, b) < 0 && cross(a, b, c) * cross(a, b, d) < 0
  );
}

/** Whether two edges of the polygon cross each other (a bow tie). */
export function selfIntersects(points: Point[]): boolean {
  const n = points.length;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      if (
        crosses(
          points[i]!,
          points[(i + 1) % n]!,
          points[j]!,
          points[(j + 1) % n]!,
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

export type ShapeProblem =
  "empty" | "open" | "tooFew" | "crossing" | "noCenter";

/** What stops the shape from being saved, if anything. */
export function shapeProblem(shape: Shape): ShapeProblem | null {
  if (shape.kind === "none") return "empty";
  if (shape.kind === "circle") return shape.center ? null : "noCenter";
  if (shape.points.length < 3) return "tooFew";
  if (!shape.closed) return "open";
  return selfIntersects(shape.points) ? "crossing" : null;
}

/** The shape as the part of the API body that carries it. */
export function shapeBody(shape: Shape): Pick<ZoneIn, "polygon" | "circle"> {
  if (shape.kind === "circle" && shape.center) {
    return {
      circle: {
        latitude: Number(shape.center[1].toFixed(6)),
        longitude: Number(shape.center[0].toFixed(6)),
        radiusMeters: Math.round(shape.radius),
      },
    };
  }
  if (shape.kind === "polygon") {
    return {
      polygon: shape.points.map(([lng, lat]) => [
        Number(lng.toFixed(6)),
        Number(lat.toFixed(6)),
      ]),
    };
  }
  return {};
}

/** The ring to draw: the polygon, or the circle around its center. */
export function shapeRing(shape: Shape): Point[] {
  if (shape.kind === "polygon") return shape.points;
  if (shape.kind === "circle" && shape.center) {
    return circleRing(shape.center, shape.radius);
  }
  return [];
}

/** Rough size of a zone in square kilometers, for the list. */
export function areaKm2(ring: Point[]): number {
  if (ring.length < 4) return 0;
  const lat0 = ring.reduce((sum, p) => sum + p[1], 0) / ring.length;
  const kx = (Math.PI / 180) * EARTH_RADIUS * Math.cos((lat0 * Math.PI) / 180);
  const ky = (Math.PI / 180) * EARTH_RADIUS;
  let twice = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const a = ring[i]!;
    const b = ring[i + 1]!;
    twice += a[0] * kx * (b[1] * ky) - b[0] * kx * (a[1] * ky);
  }
  return Math.abs(twice) / 2 / 1_000_000;
}
