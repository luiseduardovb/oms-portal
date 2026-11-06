export const STATUSES = [
  "pending",
  "accepted",
  "ready",
  "dispatched",
  "completed",
  "cancelled",
] as const;
export type Status = (typeof STATUSES)[number];

export type TabKey = "all" | Status;

export const MAIN_TABS: TabKey[] = [
  "all",
  "pending",
  "accepted",
  "ready",
  "dispatched",
  "completed",
];

export function isStatus(value: string): value is Status {
  return (STATUSES as readonly string[]).includes(value);
}

export const STATUS_COLOR: Record<
  Status,
  "warning" | "info" | "success" | "default" | "error" | "primary"
> = {
  pending: "warning",
  accepted: "info",
  ready: "primary",
  dispatched: "primary",
  completed: "success",
  cancelled: "error",
};

export type StepAction = "accept" | "ready" | "dispatch" | "complete";

/** The next step an order can take. Pickup orders skip "dispatched". */
export function nextAction(
  status: string,
  fulfillmentType: string,
): StepAction | null {
  if (status === "pending") return "accept";
  if (status === "accepted") return "ready";
  if (status === "ready") {
    return fulfillmentType === "delivery" ? "dispatch" : "complete";
  }
  if (status === "dispatched") return "complete";
  return null;
}

export function canCancel(status: string): boolean {
  return ["pending", "accepted", "ready", "dispatched"].includes(status);
}

/** YYYY-MM-DD for today on this device. */
export function todayISO(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** A wa.me link for a phone number; Honduras (504) when no country code. */
export function whatsappLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const full = digits.length === 8 ? `504${digits}` : digits;
  return `https://wa.me/${full}`;
}

/** Opens the address in Google Maps (search by text; no coordinates yet). */
export function mapLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
