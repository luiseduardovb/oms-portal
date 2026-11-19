import type { Bucket, Filters, Tax } from "./analyticsApi";

export type Preset = "today" | "last7" | "last30" | "thisMonth" | "lastMonth";
export const PRESETS: Preset[] = [
  "today",
  "last7",
  "last30",
  "thisMonth",
  "lastMonth",
];

export function isoDate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function presetRange(
  preset: Preset,
  today: Date,
): { from: string; to: string } {
  const day = (offset: number) =>
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
  switch (preset) {
    case "today":
      return { from: isoDate(today), to: isoDate(today) };
    case "last7":
      return { from: isoDate(day(-6)), to: isoDate(today) };
    case "last30":
      return { from: isoDate(day(-29)), to: isoDate(today) };
    case "thisMonth":
      return {
        from: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
        to: isoDate(today),
      };
    case "lastMonth":
      return {
        from: isoDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        to: isoDate(new Date(today.getFullYear(), today.getMonth(), 0)),
      };
  }
}

/** The preset a range equals, if any (so the picker can show it). */
export function matchPreset(
  from: string,
  to: string,
  today: Date,
): Preset | null {
  return (
    PRESETS.find((p) => {
      const r = presetRange(p, today);
      return r.from === from && r.to === to;
    }) ?? null
  );
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Filters from the address bar, with the last 30 days as the default. */
export function parseFilters(params: URLSearchParams, today: Date): Filters {
  const fallback = presetRange("last30", today);
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const valid = DATE.test(from) && DATE.test(to) && from <= to;
  const outlet = Number(params.get("outletId"));
  return {
    from: valid ? from : fallback.from,
    to: valid ? to : fallback.to,
    outletId: Number.isInteger(outlet) && outlet > 0 ? outlet : null,
    tax: (params.get("tax") === "without" ? "without" : "with") as Tax,
    bucket: (params.get("bucket") === "month" ? "month" : "day") as Bucket,
  };
}

export function filtersToQuery(f: Filters): string {
  const params = new URLSearchParams({
    from: f.from,
    to: f.to,
    tax: f.tax,
    bucket: f.bucket,
  });
  if (f.outletId) params.set("outletId", String(f.outletId));
  return params.toString();
}

/** "+12.5 %" or "-3 %"; null when there is nothing to compare with. */
export function formatChange(change: number | null): string | null {
  if (change === null) return null;
  const text = Math.abs(change).toLocaleString("es-HN", {
    maximumFractionDigits: 1,
  });
  return `${change < 0 ? "-" : "+"}${text} %`;
}

/** "5 nov" for a day bucket, "nov 2026" for a month bucket. */
export function pointLabel(iso: string, bucket: Bucket): string {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return bucket === "month"
    ? date.toLocaleDateString("es-HN", { month: "short", year: "numeric" })
    : date.toLocaleDateString("es-HN", { day: "numeric", month: "short" });
}

export function rangeLabel(from: string, to: string): string {
  return from === to
    ? pointLabel(from, "day")
    : `${pointLabel(from, "day")} – ${pointLabel(to, "day")}`;
}
