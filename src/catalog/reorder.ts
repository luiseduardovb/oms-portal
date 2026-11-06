/** Swap one id with its neighbour. Returns null when it cannot move. */
export function moveId(
  ids: number[],
  id: number,
  direction: -1 | 1,
): number[] | null {
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return null;
  const next = [...ids];
  [next[from], next[to]] = [next[to]!, next[from]!];
  return next;
}
