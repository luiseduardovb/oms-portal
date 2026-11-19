"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { BarChart } from "@mui/x-charts/BarChart";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { formatMoney } from "@/catalog/money";
import { PageFrame } from "@/components/PageFrame";
import { useErrorMessage } from "@/lib/useErrorMessage";
import {
  downloadBehavior,
  useBehaviorQuery,
  type BehaviorKind,
  type BehaviorMetric,
} from "./analyticsApi";
import { compact } from "./SalesPage";
import { FilterBar } from "./FilterBar";
import { pointLabel } from "./range";
import { useFilters } from "./useFilters";

const KINDS: BehaviorKind[] = ["fulfillment", "payment", "customers"];
const METRICS: BehaviorMetric[] = [
  "sales",
  "orders",
  "average_order",
  "customers",
];

/** "Comportamiento": the same numbers split by delivery or pickup, by how
 * they paid, and by new or returning customers. */
export function BehaviorPage() {
  const t = useTranslations("analytics");
  const errorMessage = useErrorMessage();
  const { data: me } = useMe();
  const { filters, change } = useFilters();
  const [kind, setKind] = useState<BehaviorKind>("fulfillment");
  const [metric, setMetric] = useState<BehaviorMetric>("sales");
  const result = useBehaviorQuery({ ...filters, kind, metric }, { skip: !me });
  if (!me) return null;
  if (!can(me.levels, "analytics", "view")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  const currency = me.merchant.currencyCode;
  const data = result.data;
  const money = metric === "sales" || metric === "average_order";
  const fmt = (v: number | string) =>
    money
      ? formatMoney(String(v), currency)
      : Number(v).toLocaleString("es-HN");
  const name = (key: string) => t(`behavior.keys.${key}`);
  const labels = (data?.series ?? []).map((p) =>
    pointLabel(p.date, filters.bucket),
  );
  const series = (data?.keys ?? []).map((key) => ({
    id: key,
    label: name(key),
    stack: "total",
    data: (data?.series ?? []).map((p) => Number(p.values[key] ?? 0)),
    valueFormatter: (v: number | null) => (v === null ? "" : fmt(v)),
  }));
  return (
    <PageFrame
      section={t("section")}
      title={t("behavior.title")}
      maxWidth={1200}
      actions={
        <Button
          variant="outlined"
          onClick={() => void downloadBehavior({ ...filters, kind, metric })}
          disabled={!data}
        >
          {t("export")}
        </Button>
      }
    >
      <FilterBar filters={filters} onChange={change} />
      <Tabs
        value={kind}
        onChange={(_e, value: BehaviorKind) => setKind(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        {KINDS.map((k) => (
          <Tab key={k} value={k} label={t(`behavior.kinds.${k}`)} />
        ))}
      </Tabs>
      {result.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage(result.error as ApiError)}
        </Alert>
      )}
      <Card variant="outlined" sx={{ p: { xs: 1.5, md: 2.5 }, mb: 2 }}>
        <Stack
          direction="row"
          sx={{ justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}
        >
          <TextField
            select
            size="small"
            label={t("behavior.metric")}
            value={metric}
            onChange={(e) => setMetric(e.target.value as BehaviorMetric)}
            sx={{ minWidth: 200 }}
          >
            {METRICS.map((m) => (
              <MenuItem key={m} value={m}>
                {t(`behavior.metrics.${m}`)}
              </MenuItem>
            ))}
          </TextField>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={filters.bucket}
            aria-label={t("bucket.label")}
            onChange={(_e, value) => value && change({ bucket: value })}
          >
            <ToggleButton value="day">{t("bucket.day")}</ToggleButton>
            <ToggleButton value="month">{t("bucket.month")}</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        {data ? (
          <BarChart
            height={340}
            series={series}
            xAxis={[{ scaleType: "band", data: labels }]}
            yAxis={[
              {
                width: 64,
                valueFormatter: (v: number) => compact(v, money, currency),
              },
            ]}
            margin={{ left: 8, right: 16 }}
          />
        ) : (
          <Skeleton variant="rounded" height={340} sx={{ mt: 2 }} />
        )}
      </Card>
      <Card variant="outlined">
        <TableContainer>
          <Table size="small" sx={{ "& td, & th": { whiteSpace: "nowrap" } }}>
            <TableHead>
              <TableRow>
                <TableCell>{t(`behavior.kinds.${kind}`)}</TableCell>
                <TableCell align="right">{t("kpi.sales")}</TableCell>
                <TableCell align="right">{t("kpi.averageOrder")}</TableCell>
                <TableCell align="right">{t("kpi.orders")}</TableCell>
                <TableCell align="right">{t("kpi.customers")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.totals ?? []).map((row) => (
                <TableRow key={row.key} hover>
                  <TableCell>{name(row.key)}</TableCell>
                  <TableCell align="right">
                    {formatMoney(row.sales, currency)}
                  </TableCell>
                  <TableCell align="right">
                    {formatMoney(row.averageOrder, currency)}
                  </TableCell>
                  <TableCell align="right">{row.orders}</TableCell>
                  <TableCell align="right">{row.customers}</TableCell>
                </TableRow>
              ))}
              {data && data.totals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    {t("empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </PageFrame>
  );
}
