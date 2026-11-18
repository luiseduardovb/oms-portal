import { describe, expect, it } from "vitest";
import {
  NO_SHAPE,
  areaKm2,
  circleRing,
  selfIntersects,
  shapeBody,
  shapeProblem,
  shapeReducer,
  shapeRing,
  type Point,
  type Shape,
} from "../src/delivery/zoneShape";

const A: Point = [-87.2, 14.0];
const B: Point = [-87.1, 14.0];
const C: Point = [-87.1, 14.1];
const D: Point = [-87.2, 14.1];

function draw(...points: Point[]): Shape {
  let shape = shapeReducer(NO_SHAPE, { type: "polygon" });
  for (const point of points) {
    shape = shapeReducer(shape, { type: "add", point });
  }
  return shape;
}

describe("drawing a polygon", () => {
  it("adds points, closes at 3 or more and then stops adding", () => {
    let shape = draw(A, B);
    expect(shapeReducer(shape, { type: "close" })).toMatchObject({
      closed: false,
    });
    shape = shapeReducer(draw(A, B, C), { type: "close" });
    expect(shape).toMatchObject({ closed: true });
    expect(shapeReducer(shape, { type: "add", point: D })).toBe(shape);
  });

  it("undoes the last point and reopens a closed shape", () => {
    const closed = shapeReducer(draw(A, B, C), { type: "close" });
    expect(shapeReducer(closed, { type: "undo" })).toEqual({
      kind: "polygon",
      points: [A, B],
      closed: false,
    });
  });

  it("moves a point and clears everything", () => {
    const shape = shapeReducer(draw(A, B, C), {
      type: "move",
      index: 1,
      point: D,
    });
    expect(shapeRing(shape)[1]).toEqual(D);
    expect(shapeReducer(shape, { type: "clear" })).toEqual({
      kind: "polygon",
      points: [],
      closed: false,
    });
  });

  it("loads a closed ring from the API without its repeated end", () => {
    const shape = shapeReducer(NO_SHAPE, {
      type: "load",
      ring: [A, B, C, D, A],
    });
    expect(shape).toEqual({
      kind: "polygon",
      points: [A, B, C, D],
      closed: true,
    });
  });
});

describe("a circle", () => {
  it("needs a center and follows the radius", () => {
    let shape = shapeReducer(NO_SHAPE, { type: "circle", radius: 1500 });
    expect(shapeProblem(shape)).toBe("noCenter");
    shape = shapeReducer(shape, { type: "center", point: A });
    shape = shapeReducer(shape, { type: "radius", radius: 3000 });
    expect(shapeProblem(shape)).toBeNull();
    expect(shapeBody(shape)).toEqual({
      circle: { latitude: 14, longitude: -87.2, radiusMeters: 3000 },
    });
    const ring = shapeRing(shape);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it("makes a ring about the right size", () => {
    const ring = circleRing([-87.1921, 14.0723], 2000);
    expect(areaKm2(ring)).toBeGreaterThan(12);
    expect(areaKm2(ring)).toBeLessThan(13);
  });
});

describe("what blocks saving", () => {
  it("names each problem", () => {
    expect(shapeProblem(NO_SHAPE)).toBe("empty");
    expect(shapeProblem(draw(A, B))).toBe("tooFew");
    expect(shapeProblem(draw(A, B, C))).toBe("open");
    expect(
      shapeProblem(shapeReducer(draw(A, B, C), { type: "close" })),
    ).toBeNull();
    // A bow tie: the edges cross.
    expect(selfIntersects([A, C, B, D])).toBe(true);
    expect(selfIntersects([A, B, C, D])).toBe(false);
    expect(
      shapeProblem(shapeReducer(draw(A, C, B, D), { type: "close" })),
    ).toBe("crossing");
  });

  it("sends a polygon as longitude and latitude pairs", () => {
    const shape = shapeReducer(draw(A, B, C), { type: "close" });
    expect(shapeBody(shape)).toEqual({ polygon: [A, B, C] });
  });
});
