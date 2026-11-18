/** Two letters for an avatar: "Ana López" is "AL", "Luis" is "L". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]![0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)![0] ?? "") : "";
  return (first + last).toUpperCase();
}

const PALETTE = [
  "#7c4dff",
  "#0288d1",
  "#00897b",
  "#ef6c00",
  "#d81b60",
  "#5d4037",
  "#3949ab",
  "#689f38",
];

/** A steady colour per name, so a person keeps theirs everywhere. */
export function avatarColor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length]!;
}

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

/** "hoy", "ayer", "hace 3 días", "hace 2 meses". */
export function relativeDay(value: string, now: Date = new Date()): string {
  const days = Math.round(
    (new Date(value).getTime() - now.getTime()) / 86_400_000,
  );
  if (days > -45) return rtf.format(days, "day");
  const months = Math.round(days / 30);
  if (months > -12) return rtf.format(months, "month");
  return rtf.format(Math.round(days / 365), "year");
}

export function percent(part: number, whole: number): string {
  return whole === 0 ? "0%" : `${Math.round((part / whole) * 100)}%`;
}
