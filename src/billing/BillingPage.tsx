"use client";

import CheckIcon from "@mui/icons-material/Check";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { ApiError } from "@/api/apiError";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { PageFrame } from "@/components/PageFrame";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { useMyBillingQuery, type PlanFeature } from "./billingApi";
import { GRACE_DAYS, addDays, day, daysUntil } from "./dates";

const STATUS_COLOR = {
  trialing: "info",
  active: "success",
  past_due: "warning",
  suspended: "error",
} as const;

const INVOICE_COLOR = {
  open: "warning",
  paid: "success",
  void: "default",
} as const;

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
      <Typography variant="h6" component="h2" sx={{ fontWeight: 700, mb: 2 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

/** "Facturación": the store's plan, what it includes, and its invoices. */
export function BillingPage() {
  const t = useTranslations("billing");
  const cycles = useTranslations("billing.cycles");
  const errorMessage = useErrorMessage();
  const format = useFormatter();
  const { data: me } = useMe();
  const query = useMyBillingQuery(undefined, {
    skip: !me,
    refetchOnMountOrArgChange: true,
  });
  if (!me) return null;
  if (!can(me.levels, "billing", "view")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }

  const data = query.data;
  const sub = data?.subscription;
  const money = (amount: string, currency: string) =>
    format.number(Number(amount), { style: "currency", currency });
  const date = (value: string | Date) =>
    format.dateTime(typeof value === "string" ? day(value) : value, {
      dateStyle: "long",
    });
  const left = sub?.dueOn ? daysUntil(sub.dueOn) : null;

  // What the owner most needs to know about the state of the account.
  let notice: ReactNode = null;
  if (sub?.status === "suspended") {
    notice = <Alert severity="error">{t("notice.suspended")}</Alert>;
  } else if (sub?.status === "past_due" && sub.dueOn) {
    notice = (
      <Alert severity="warning">
        {t("notice.pastDue", {
          date: date(addDays(sub.dueOn, GRACE_DAYS)),
        })}
      </Alert>
    );
  } else if (sub?.status === "trialing" && left !== null) {
    notice = (
      <Alert severity={left <= 3 ? "warning" : "info"}>
        {t("notice.trial", { count: Math.max(left, 0) })}
      </Alert>
    );
  } else if (left !== null && left >= 0 && left <= 7) {
    notice = (
      <Alert severity="info">{t("notice.renews", { count: left })}</Alert>
    );
  }

  const groups = new Map<string, { label: string; items: PlanFeature[] }>();
  for (const f of data?.plan?.features ?? []) {
    const g = groups.get(f.module) ?? { label: f.moduleLabel, items: [] };
    g.items.push(f);
    groups.set(f.module, g);
  }
  const quantity = (f: PlanFeature) =>
    f.kind === "toggle"
      ? null
      : f.quantity === null
        ? t("unlimited")
        : t("upTo", { count: f.quantity });

  return (
    <PageFrame section={t("section")} title={t("title")} maxWidth={1000}>
      <Stack spacing={3}>
        {query.error ? (
          <Alert severity="error">
            {errorMessage(query.error as ApiError)}
          </Alert>
        ) : null}
        {query.isLoading ? <Skeleton variant="rounded" height={160} /> : null}
        {notice}

        {data ? (
          <Card title={t("plan.title")}>
            {sub && data.plan ? (
              <Stack spacing={1.5}>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ alignItems: "center", flexWrap: "wrap" }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {data.plan.title}
                  </Typography>
                  <Chip
                    size="small"
                    color={
                      STATUS_COLOR[sub.status as keyof typeof STATUS_COLOR]
                    }
                    label={t(
                      `status.${sub.status as keyof typeof STATUS_COLOR}`,
                    )}
                  />
                </Stack>
                {data.plan.caption ? (
                  <Typography color="text.secondary">
                    {data.plan.caption}
                  </Typography>
                ) : null}
                <Typography>
                  {sub.cycle
                    ? `${money(sub.amount, sub.currencyCode)} · ${cycles(sub.cycle as "monthly")}`
                    : t("plan.free")}
                </Typography>
                <Typography color="text.secondary">
                  {sub.dueOn
                    ? t("plan.due", { date: date(sub.dueOn) })
                    : t("plan.noDue")}
                </Typography>
                {data.plan.description ? (
                  <Typography sx={{ whiteSpace: "pre-line" }}>
                    {data.plan.description}
                  </Typography>
                ) : null}
              </Stack>
            ) : (
              <Typography color="text.secondary">{t("plan.none")}</Typography>
            )}
          </Card>
        ) : null}

        {groups.size > 0 ? (
          <Card title={t("includes")}>
            <Box
              sx={{
                display: "grid",
                gap: 3,
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              }}
            >
              {[...groups.entries()].map(([key, g]) => (
                <Box key={key}>
                  <Typography sx={{ fontWeight: 700, mb: 1 }}>
                    {g.label}
                  </Typography>
                  <Stack spacing={0.5}>
                    {g.items.map((f) => (
                      <Stack
                        key={f.key}
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: "center" }}
                      >
                        <CheckIcon fontSize="small" color="success" />
                        <Typography>
                          {f.label}
                          {quantity(f) ? ` · ${quantity(f)}` : ""}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Box>
            {data?.plan?.hardLimit ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {t("hardLimit")}
              </Typography>
            ) : null}
          </Card>
        ) : null}

        {data && data.addons.length > 0 ? (
          <Card title={t("addons")}>
            <Stack spacing={1}>
              {data.addons.map((a) => (
                <Typography key={a.addonId}>
                  <b>{a.title}</b> · {money(a.amount, a.currencyCode)} ·{" "}
                  {cycles(a.cycle as "monthly")}
                </Typography>
              ))}
            </Stack>
          </Card>
        ) : null}

        {data ? (
          <Card title={t("invoices.title")}>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {(
                      [
                        "number",
                        "description",
                        "period",
                        "due",
                        "amount",
                        "status",
                      ] as const
                    ).map((c) => (
                      <TableCell key={c}>
                        {t(`invoices.columns.${c}`)}
                      </TableCell>
                    ))}
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.invoices.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                        {i.number}
                      </TableCell>
                      <TableCell>{i.description ?? "—"}</TableCell>
                      <TableCell>
                        {i.periodFrom && i.periodTo
                          ? `${date(i.periodFrom)} – ${date(i.periodTo)}`
                          : "—"}
                      </TableCell>
                      <TableCell>{date(i.dueOn)}</TableCell>
                      <TableCell>{money(i.amount, i.currencyCode)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={
                            INVOICE_COLOR[
                              i.status as keyof typeof INVOICE_COLOR
                            ]
                          }
                          label={t(
                            `invoices.status.${i.status as keyof typeof INVOICE_COLOR}`,
                          )}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {i.status === "open" && data.paymentLink ? (
                          <Button
                            href={data.paymentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="small"
                            variant="contained"
                          >
                            {t("invoices.pay")}
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Typography
                          color="text.secondary"
                          sx={{ py: 2, textAlign: "center" }}
                        >
                          {t("invoices.none")}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {t("invoices.help")}
            </Typography>
          </Card>
        ) : null}
      </Stack>
    </PageFrame>
  );
}
