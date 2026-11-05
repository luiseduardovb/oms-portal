const SYMBOLS: Record<string, string> = { HNL: "L", USD: "$" };

export function currencySymbol(currency: string): string {
  return SYMBOLS[currency] ?? currency;
}

/** "1250.5" in HNL becomes "L 1,250.50". The API sends money as strings. */
export function formatMoney(value: string, currency: string): string {
  const number = Number(value);
  const text = Number.isFinite(number)
    ? number.toLocaleString("es-HN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : value;
  return `${currencySymbol(currency)} ${text}`;
}

/** Two decimals at most, no thousands separators: what the API accepts. */
export const MONEY_INPUT = /^\d{1,10}(\.\d{1,2})?$/;

export type StockLevel = "in" | "out" | "low" | "tracked";

export function stockLevel(outlet: {
  stockStatus: string;
  quantity: number | null;
  lowStockThreshold: number | null;
  isSoldOut: boolean;
}): StockLevel {
  if (outlet.isSoldOut) return "out";
  if (outlet.stockStatus === "tracked") {
    const { quantity, lowStockThreshold } = outlet;
    if (
      quantity !== null &&
      lowStockThreshold !== null &&
      quantity <= lowStockThreshold
    ) {
      return "low";
    }
    return "tracked";
  }
  return "in";
}
