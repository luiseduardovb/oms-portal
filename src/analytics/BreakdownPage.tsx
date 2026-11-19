"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import type { ApiError } from "@/api/apiError";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { formatMoney } from "@/catalog/money";
import { PageFrame } from "@/components/PageFrame";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { downloadSales, useSalesAnalyticsQuery } from "./analyticsApi";
import { FilterBar } from "./FilterBar";
import { pointLabel } from "./range";
import { useFilters } from "./useFilters";

/** "Desglose de ventas": the sales chart's numbers, one row per day or month. */
export function BreakdownPage() {
  const t = useTranslations("analytics");
  const errorMessage = useErrorMessage();
  const { data: me } = useMe();
  const { filters, change, query } = useFilters();
  const result = useSalesAnalyticsQuery(
    { ...filters, previous: false, year: false },
    { skip: !me },
  );
  if (!me) return null;
  if (!can(me.levels, "analytics", "view")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  const currency = me.merchant.currencyCode;
  const rows = result.data?.series ?? [];
  return (
    <PageFrame
      section={t("section")}
      title={t("breakdown.title")}
      maxWidth={1200}
      actions={
        <>
          <Button
            component={NextLink}
            href={`/analytics/sales?${query}`}
            sx={{ mr: 1 }}
          >
            {t("breakdown.back")}
          </Button>
          <Button
            variant="outlined"
            onClick={() => void downloadSales(filters)}
            disabled={!result.data}
          >
            {t("export")}
          </Button>
        </>
      }
    >
      <FilterBar filters={filters} onChange={change} />
      <ToggleButtonGroup
        exclusive
        size="small"
        value={filters.bucket}
        aria-label={t("bucket.label")}
        onChange={(_e, value) => value && change({ bucket: value })}
        sx={{ mb: 2 }}
      >
        <ToggleButton value="day">{t("bucket.day")}</ToggleButton>
        <ToggleButton value="month">{t("bucket.month")}</ToggleButton>
      </ToggleButtonGroup>
      {result.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage(result.error as ApiError)}
        </Alert>
      )}
      {result.isLoading ? (
        <Skeleton variant="rounded" height={320} />
      ) : (
        <Card variant="outlined">
          <TableContainer>
            <Table size="small" sx={{ "& td, & th": { whiteSpace: "nowrap" } }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t("breakdown.date")}</TableCell>
                  <TableCell align="right">{t("kpi.sales")}</TableCell>
                  <TableCell align="right">{t("kpi.averageOrder")}</TableCell>
                  <TableCell align="right">{t("kpi.orders")}</TableCell>
                  <TableCell align="right">{t("kpi.customers")}</TableCell>
                  <TableCell align="right">{t("kpi.delivery")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.date} hover>
                    <TableCell>{pointLabel(p.date, filters.bucket)}</TableCell>
                    <TableCell align="right">
                      {formatMoney(p.sales, currency)}
                    </TableCell>
                    <TableCell align="right">
                      {formatMoney(p.averageOrder, currency)}
                    </TableCell>
                    <TableCell align="right">{p.orders}</TableCell>
                    <TableCell align="right">{p.customers}</TableCell>
                    <TableCell align="right">
                      {formatMoney(p.delivery, currency)}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      {t("empty")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </PageFrame>
  );
}
