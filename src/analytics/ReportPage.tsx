"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Pagination from "@mui/material/Pagination";
import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { formatMoney } from "@/catalog/money";
import { PageFrame } from "@/components/PageFrame";
import { useErrorMessage } from "@/lib/useErrorMessage";
import {
  downloadReport,
  useReportDaysQuery,
  useReportOrdersQuery,
} from "./analyticsApi";
import { FilterBar } from "./FilterBar";
import { pointLabel } from "./range";
import { useFilters } from "./useFilters";

const PER_PAGE = 25;

/** "Reporte de ventas": every day, or every order, with its subtotal,
 * discounts, tax, delivery and total, to read or take to the accountant. */
export function ReportPage() {
  const t = useTranslations("analytics");
  const errorMessage = useErrorMessage();
  const { data: me } = useMe();
  const { filters, change } = useFilters();
  const [group, setGroup] = useState<"day" | "order">("day");
  const [page, setPage] = useState(1);
  const days = useReportDaysQuery(filters, {
    skip: !me || group !== "day",
  });
  const orders = useReportOrdersQuery(
    { ...filters, page, itemsPerPage: PER_PAGE },
    { skip: !me || group !== "order" },
  );
  if (!me) return null;
  if (!can(me.levels, "analytics", "view")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  const currency = me.merchant.currencyCode;
  const m = (v: string) => formatMoney(v, currency);
  const current = group === "day" ? days : orders;
  const totals = days.data?.totals;
  return (
    <PageFrame
      section={t("section")}
      title={t("report.title")}
      maxWidth={1300}
      actions={
        <Button
          variant="outlined"
          onClick={() => void downloadReport(filters, group)}
        >
          {t("export")}
        </Button>
      }
    >
      <FilterBar
        filters={filters}
        tax={false}
        onChange={(patch) => {
          setPage(1);
          change(patch);
        }}
      />
      <ToggleButtonGroup
        exclusive
        size="small"
        value={group}
        aria-label={t("report.group")}
        onChange={(_e, value) => {
          if (value) {
            setGroup(value);
            setPage(1);
          }
        }}
        sx={{ mb: 2 }}
      >
        <ToggleButton value="day">{t("report.byDay")}</ToggleButton>
        <ToggleButton value="order">{t("report.byOrder")}</ToggleButton>
      </ToggleButtonGroup>
      {current.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage(current.error as ApiError)}
        </Alert>
      )}
      {current.isLoading ? (
        <Skeleton variant="rounded" height={320} />
      ) : (
        <Card variant="outlined">
          <TableContainer>
            <Table size="small" sx={{ "& td, & th": { whiteSpace: "nowrap" } }}>
              <TableHead>
                <TableRow>
                  <TableCell>
                    {group === "day" ? t("report.date") : t("report.order")}
                  </TableCell>
                  {group === "order" && (
                    <>
                      <TableCell>{t("report.outlet")}</TableCell>
                      <TableCell>{t("report.customer")}</TableCell>
                      <TableCell>{t("report.type")}</TableCell>
                      <TableCell>{t("report.payment")}</TableCell>
                    </>
                  )}
                  {group === "day" && (
                    <>
                      <TableCell align="right">{t("report.orders")}</TableCell>
                      <TableCell align="right">{t("report.items")}</TableCell>
                    </>
                  )}
                  <TableCell align="right">{t("report.subtotal")}</TableCell>
                  <TableCell align="right">{t("report.discounts")}</TableCell>
                  <TableCell align="right">{t("report.tax")}</TableCell>
                  <TableCell align="right">{t("report.delivery")}</TableCell>
                  <TableCell align="right">{t("report.total")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {group === "day" &&
                  (days.data?.rows ?? []).map((r) => (
                    <TableRow key={r.date} hover>
                      <TableCell>{pointLabel(r.date, "day")}</TableCell>
                      <TableCell align="right">{r.orders}</TableCell>
                      <TableCell align="right">{r.items}</TableCell>
                      <TableCell align="right">{m(r.subtotal)}</TableCell>
                      <TableCell align="right">{m(r.discounts)}</TableCell>
                      <TableCell align="right">{m(r.tax)}</TableCell>
                      <TableCell align="right">{m(r.delivery)}</TableCell>
                      <TableCell align="right">{m(r.total)}</TableCell>
                    </TableRow>
                  ))}
                {group === "order" &&
                  (orders.data?.results ?? []).map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>
                        #{r.orderNumber} · {pointLabel(r.date, "day")}
                      </TableCell>
                      <TableCell>{r.outletName}</TableCell>
                      <TableCell>{r.customerName}</TableCell>
                      <TableCell>
                        {t(`behavior.keys.${r.fulfillmentType}`)}
                      </TableCell>
                      <TableCell>
                        {t(`behavior.keys.${r.paymentMethod}`)}
                      </TableCell>
                      <TableCell align="right">{m(r.subtotal)}</TableCell>
                      <TableCell align="right">{m(r.discounts)}</TableCell>
                      <TableCell align="right">{m(r.tax)}</TableCell>
                      <TableCell align="right">{m(r.delivery)}</TableCell>
                      <TableCell align="right">{m(r.total)}</TableCell>
                    </TableRow>
                  ))}
                {group === "day" && totals && days.data?.rows.length ? (
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {t("report.totals")}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {totals.orders}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {totals.items}
                    </TableCell>
                    {(
                      [
                        totals.subtotal,
                        totals.discounts,
                        totals.tax,
                        totals.delivery,
                        totals.total,
                      ] as string[]
                    ).map((v, i) => (
                      <TableCell key={i} align="right" sx={{ fontWeight: 700 }}>
                        {m(v)}
                      </TableCell>
                    ))}
                  </TableRow>
                ) : null}
                {((group === "day" && days.data?.rows.length === 0) ||
                  (group === "order" && orders.data?.totalCount === 0)) && (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      {t("empty")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
      {group === "order" && (orders.data?.totalPages ?? 0) > 1 && (
        <Pagination
          sx={{ mt: 2 }}
          count={orders.data?.totalPages}
          page={page}
          onChange={(_e, value) => setPage(value)}
        />
      )}
    </PageFrame>
  );
}
