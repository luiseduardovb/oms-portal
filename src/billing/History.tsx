"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useFormatter, useTranslations } from "next-intl";
import type { BillingEvent } from "./billingApi";

type Event = Pick<
  BillingEvent,
  "id" | "kind" | "detail" | "source" | "createdAt"
>;

const KINDS = [
  "plan_assigned",
  "addon_set",
  "addon_removed",
  "invoice_issued",
  "invoice_paid",
  "invoice_void",
  "reactivated",
] as const;
type Kind = (typeof KINDS)[number];

/** "Historial": what happened to the plan and invoices, newest first. */
export function History({ events }: { events: Event[] }) {
  const t = useTranslations("billing.history");
  const format = useFormatter();
  const text = (e: Event): string => {
    if (e.kind === "status_changed") {
      return e.detail.status === "suspended"
        ? t("status_suspended")
        : t("status_past_due");
    }
    if (!(KINDS as readonly string[]).includes(e.kind)) return e.kind;
    return t(e.kind as Kind, {
      plan: e.detail.plan ?? "",
      addon: e.detail.addon ?? "",
      number: e.detail.number ?? "",
    });
  };
  if (events.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 1 }}>
        {t("none")}
      </Typography>
    );
  }
  return (
    <Stack component="ul" spacing={1.5} sx={{ m: 0, p: 0, listStyle: "none" }}>
      {events.map((e) => (
        <Box
          component="li"
          key={e.id}
          sx={{ display: "flex", gap: 2, alignItems: "baseline" }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ minWidth: 150, whiteSpace: "nowrap" }}
          >
            {format.dateTime(new Date(e.createdAt), {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </Typography>
          <Typography>
            {text(e)}
            <Typography component="span" variant="body2" color="text.secondary">
              {" · "}
              {e.source === "system" ? t("bySystem") : t("byPlatform")}
            </Typography>
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
