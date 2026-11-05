import { describe, expect, it } from "vitest";
import {
  findOverlap,
  passesMidnight,
  weekFromApi,
  weekToApi,
  type Week,
} from "@/outlets/hours";
import { todayAt } from "@/outlets/ExceptionsTab";

const day = (opensAt: string, closesAt: string) => ({ opensAt, closesAt });

describe("opening hours rules", () => {
  it("accepts separate and touching intervals", () => {
    const week: Week = {
      1: [day("08:00", "12:00"), day("14:00", "22:00")],
      2: [day("08:00", "15:00"), day("15:00", "22:00")],
    };
    expect(findOverlap(week)).toBeNull();
    expect(findOverlap({})).toBeNull();
  });

  it("finds an overlap within a day", () => {
    expect(
      findOverlap({ 3: [day("08:00", "15:00"), day("14:00", "20:00")] }),
    ).toEqual([3, 3]);
  });

  it("sees a late night running into the next morning", () => {
    const late = day("22:00", "02:00");
    expect(findOverlap({ 5: [late], 6: [day("01:00", "09:00")] })).toEqual([
      5, 6,
    ]);
    expect(findOverlap({ 5: [late], 6: [day("02:00", "09:00")] })).toBeNull();
  });

  it("wraps Sunday night into Monday", () => {
    const sunday = day("22:00", "03:00");
    expect(findOverlap({ 7: [sunday], 1: [day("02:00", "10:00")] })).toEqual([
      7, 1,
    ]);
    expect(findOverlap({ 7: [sunday], 1: [day("03:00", "10:00")] })).toBeNull();
  });

  it("spots midnight crossings", () => {
    expect(passesMidnight(day("22:00", "02:00"))).toBe(true);
    expect(passesMidnight(day("08:00", "22:00"))).toBe(false);
  });

  it("converts to and from the API shape", () => {
    const week = weekFromApi([
      { weekday: 2, opensAt: "08:00:00", closesAt: "12:00:00" },
      { weekday: 1, opensAt: "09:00:00", closesAt: "10:00:00" },
    ]);
    expect(week[2]).toEqual([day("08:00", "12:00")]);
    expect(weekToApi(week)).toEqual([
      { weekday: 1, opensAt: "09:00", closesAt: "10:00" },
      { weekday: 2, opensAt: "08:00", closesAt: "12:00" },
    ]);
  });

  it("finds today's date at the outlet, not in UTC", () => {
    // 03:00 UTC on the 6th is still the evening of the 5th in Honduras.
    const instant = new Date("2026-11-06T03:00:00Z");
    expect(todayAt("America/Tegucigalpa", instant)).toBe("2026-11-05");
    expect(todayAt("UTC", instant)).toBe("2026-11-06");
  });
});
