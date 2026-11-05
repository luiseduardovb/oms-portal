/** Opening-hour rules, the same ones the API enforces, so mistakes show up
 * before saving. Times are "HH:MM". The week is a circle: an interval that
 * closes before it opens passes midnight into the next day, and Sunday night
 * runs into Monday. */

export interface Interval {
  opensAt: string;
  closesAt: string;
}

export type Week = Record<number, Interval[]>;

const DAY = 24 * 60;
const WEEK = 7 * DAY;

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export function minutes(time: string): number {
  const [hours = "0", mins = "0"] = time.split(":");
  return Number(hours) * 60 + Number(mins);
}

export function passesMidnight(interval: Interval): boolean {
  return minutes(interval.closesAt) < minutes(interval.opensAt);
}

/** "08:00:00" → "08:00" */
export function shortTime(time: string): string {
  return time.slice(0, 5);
}

export function isValidTime(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

function span(weekday: number, interval: Interval): [number, number] {
  const start = (weekday - 1) * DAY + minutes(interval.opensAt);
  let length = minutes(interval.closesAt) - minutes(interval.opensAt);
  if (length <= 0) length += DAY;
  return [start, start + length];
}

/** The weekdays of the first two intervals that overlap, or null. Intervals
 * that only touch (closing 15:00, opening 15:00) are fine. */
export function findOverlap(week: Week): [number, number] | null {
  const spans: [number, number, number][] = [];
  for (const weekday of WEEKDAYS)
    for (const interval of week[weekday] ?? []) {
      const [start, end] = span(weekday, interval);
      spans.push([start, end, weekday]);
    }
  spans.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (let index = 0; index + 1 < spans.length; index += 1) {
    const current = spans[index]!;
    const next = spans[index + 1]!;
    if (current[1] > next[0]) return [current[2], next[2]];
  }
  const first = spans[0];
  if (first) {
    const last = spans.reduce((a, b) => (b[1] > a[1] ? b : a));
    if (last[1] > first[0] + WEEK) return [last[2], first[2]];
  }
  return null;
}

export function weekFromApi(
  hours: { weekday: number; opensAt: string; closesAt: string }[],
): Week {
  const week: Week = {};
  for (const hour of hours)
    (week[hour.weekday] ??= []).push({
      opensAt: shortTime(hour.opensAt),
      closesAt: shortTime(hour.closesAt),
    });
  return week;
}

export function weekToApi(week: Week) {
  return WEEKDAYS.flatMap((weekday) =>
    (week[weekday] ?? []).map((interval) => ({ weekday, ...interval })),
  );
}
