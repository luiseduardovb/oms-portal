export type Level = "none" | "view" | "full";

const RANK: Record<string, number> = { none: 0, view: 1, full: 2 };

/** Does the role reach this level in this area? `full` includes `view`, and
 * an area the role does not list counts as none. The server checks every
 * request itself; this only decides what to draw. */
export function can(
  levels: Record<string, string> | undefined,
  area: string,
  level: Exclude<Level, "none"> = "view",
): boolean {
  return (RANK[levels?.[area] ?? "none"] ?? 0) >= (RANK[level] ?? 0);
}

/** Only follow a `next` address that stays on this site. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}
