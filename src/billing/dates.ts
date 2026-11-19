/** Days a store stays online after its due day without paying (D-072). */
export const GRACE_DAYS = 5;

/** A date-only string ("2026-12-03") as that day at noon, in any time zone. */
export function day(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

export function addDays(value: string, days: number): Date {
  const d = day(value);
  d.setDate(d.getDate() + days);
  return d;
}

/** Whole days from today to the date; negative when it has passed. */
export function daysUntil(value: string, now: Date = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = day(value);
  const end = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  return Math.round((end.getTime() - today.getTime()) / 86_400_000);
}
