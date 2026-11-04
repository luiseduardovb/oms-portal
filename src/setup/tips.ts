export const MAX_TIP_PRESETS = 5;

/** "5, 10, 15" → [5, 10, 15]. Null when the text is not a valid list: up to
 * five distinct percentages from 0 to 100, from smallest to largest. An empty
 * text is a valid, empty list. */
export function parseTipPresets(text: string): number[] | null {
  const parts = text
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
  if (parts.length > MAX_TIP_PRESETS) return null;
  const values: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(part)) return null;
    const value = Number(part);
    if (value < 0 || value > 100) return null;
    const last = values[values.length - 1];
    if (last !== undefined && value <= last) return null;
    values.push(value);
  }
  return values;
}

export function formatTipPresets(values: string[]): string {
  return values.map((value) => String(Number(value))).join(", ");
}
