"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { LineChart } from "@mui/x-charts/LineChart";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { currencySymbol, formatMoney } from "@/catalog/money";
import { PageFrame } from "@/components/PageFrame";
import { useErrorMessage } from "@/lib/useErrorMessage";
import {
  downloadSales,
  useSalesAnalyticsQuery,
  type SalesAnalytics,
  type SalesPoint,
} from "./analyticsApi";
import { ChangeChip } from "./ChangeChip";
import { FilterBar } from "./FilterBar";
import { pointLabel, rangeLabel } from "./range";
import { useFilters } from "./useFilters";

type KpiKey = "sales" | "averageOrder" | "orders" | "customers";
const KPIS: KpiKey[] = ["sales", "averageOrder", "orders", "customers"];
const IS_MONEY: Record<KpiKey, boolean> = {
  sales: true,
  averageOrder: true,
  orders: false,
  customers: false,
};

function amount(value: string | number, money: boolean, currency: string) {
  return money
    ? formatMoney(String(value), currency)
    : Number(value).toLocaleString("es-HN");
}

/** Short axis labels ("L 100 mil") so they fit on a phone. */
export function compact(v: number, money: boolean, currency: string): string {
  const text = new Intl.NumberFormat("es-HN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
  return money ? `${currencySymbol(currency)} ${text}` : text;
}

function values(points: SalesPoint[] | null | undefined, key: KpiKey) {
  return (points ?? []).map((p) => Number(p[key]));
}

export function SalesPage() {
  const t = useTranslations("analytics");
  const errorMessage = useErrorMessage();
  const { data: me } = useMe();
  const { filters, change, query } = useFilters();
  const [kpi, setKpi] = useState<KpiKey>("sales");
  const [previous, setPrevious] = useState(false);
  const [year, setYear] = useState(false);
  const result = useSalesAnalyticsQuery(
    { ...filters, previous, year },
    { skip: !me },
  );
  if (!me) return null;
  if (!can(me.levels, "analytics", "view")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  const currency = me.merchant.currencyCode;
  const data: SalesAnalytics | undefined = result.data;
  const money = IS_MONEY[kpi];
  const fmt = (v: number | string) => amount(v, money, currency);
  const axis = (v: number) => compact(v, money, currency);

  const labels = (data?.series ?? []).map((p) =>
    pointLabel(p.date, filters.bucket),
  );
  const line = (points: SalesPoint[] | null | undefined) => {
    const list = values(points, kpi);
    return labels.map((_l, i) => list[i] ?? null);
  };
  const series = [
    {
      data: line(data?.series),
      label: t("sales.selected"),
      showMark: false,
      curve: "linear" as const,
      area: true,
      valueFormatter: (v: number | null) => (v === null ? "" : fmt(v)),
    },
    ...(previous
      ? [
          {
            data: line(data?.previous),
            label: t("sales.previousPeriod"),
            showMark: false,
            curve: "linear" as const,
            valueFormatter: (v: number | null) => (v === null ? "" : fmt(v)),
          },
        ]
      : []),
    ...(year
      ? [
          {
            data: line(data?.previousYear),
            label: t("sales.previousYear"),
            showMark: false,
            curve: "linear" as const,
            valueFormatter: (v: number | null) => (v === null ? "" : fmt(v)),
          },
        ]
      : []),
  ];
  const compare = [previous && "previous", year && "year"].filter(
    Boolean,
  ) as string[];

  return (
    <PageFrame
      section={t("section")}
      title={t("sales.title")}
      maxWidth={1200}
      actions={
        <Button
          variant="outlined"
          onClick={() => void downloadSales(filters)}
          disabled={!data}
        >
          {t("export")}
        </Button>
      }
    >
      <FilterBar filters={filters} onChange={change} />
      {result.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage(result.error as ApiError)}
        </Alert>
      )}
      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          mb: 2,
        }}
      >
        {KPIS.map((key) => {
          const k = data?.kpis[key];
          const selected = key === kpi;
          return (
            <Card
              key={key}
              variant="outlined"
              component="button"
              type="button"
              aria-pressed={selected}
              onClick={() => setKpi(key)}
              sx={{
                p: 2,
                textAlign: "left",
                cursor: "pointer",
                font: "inherit",
                color: "inherit",
                borderColor: selected ? "primary.main" : "divider",
                borderWidth: selected ? 2 : 1,
                bgcolor: "background.paper",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {t(`kpi.${key}`)}
              </Typography>
              {k ? (
                <>
                  <Typography
                    sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 700 }}
                  >
                    {amount(k.value, IS_MONEY[key], currency)}
                  </Typography>
                  <ChangeChip change={k.change} />
                </>
              ) : (
                <Skeleton width="70%" height={44} />
              )}
            </Card>
          );
        })}
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", lg: "1fr 300px" },
        }}
      >
        <Card variant="outlined" sx={{ p: { xs: 1.5, md: 2.5 } }}>
          <Stack
            direction="row"
            sx={{
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1.5,
              mb: 1,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {t(`kpi.${kpi}`)}
            </Typography>
            <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
              <ToggleButtonGroup
                size="small"
                value={compare}
                aria-label={t("sales.compare")}
                onChange={(_e, value: string[]) => {
                  setPrevious(value.includes("previous"));
                  setYear(value.includes("year"));
                }}
              >
                <ToggleButton value="previous">
                  {t("sales.previousPeriod")}
                </ToggleButton>
                <ToggleButton value="year">
                  {t("sales.previousYear")}
                </ToggleButton>
              </ToggleButtonGroup>
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
          </Stack>
          {data ? (
            <LineChart
              height={340}
              series={series}
              xAxis={[{ scaleType: "point", data: labels }]}
              yAxis={[{ width: 64, valueFormatter: (v: number) => axis(v) }]}
              hideLegend={series.length < 2}
              margin={{ left: 8, right: 16 }}
            />
          ) : (
            <Skeleton variant="rounded" height={340} />
          )}
          {data && data.series.length === 0 && (
            <Typography color="text.secondary">{t("empty")}</Typography>
          )}
        </Card>

        <Stack sx={{ gap: 2 }}>
          <Card variant="outlined" sx={{ p: 2 }}>
            {data ? (
              <Stack sx={{ gap: 2 }}>
                <Period
                  label={t("sales.selected")}
                  range={rangeLabel(data.period.dateFrom, data.period.dateTo)}
                  value={fmt(data.kpis[kpi].value)}
                />
                <Period
                  label={t("sales.previousPeriod")}
                  range={rangeLabel(
                    data.previousPeriod.dateFrom,
                    data.previousPeriod.dateTo,
                  )}
                  value={fmt(data.kpis[kpi].previous)}
                  change={data.kpis[kpi].change}
                />
                <Period
                  label={t("sales.previousYear")}
                  range={rangeLabel(
                    data.previousYearPeriod.dateFrom,
                    data.previousYearPeriod.dateTo,
                  )}
                  value={fmt(data.kpis[kpi].previousYear)}
                  change={data.kpis[kpi].changeYear}
                />
              </Stack>
            ) : (
              <Skeleton variant="rounded" height={200} />
            )}
          </Card>
          <Card variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t("kpi.delivery")}
            </Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 700 }}>
              {data ? formatMoney(data.kpis.delivery.value, currency) : "—"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("sales.deliveryNote")}
            </Typography>
          </Card>
          <Button
            component={NextLink}
            href={`/analytics/sales/breakdown?${query}`}
            variant="contained"
          >
            {t("sales.fullReport")}
          </Button>
        </Stack>
      </Box>
    </PageFrame>
  );
}

function Period({
  label,
  range,
  value,
  change,
}: {
  label: string;
  range: string;
  value: string;
  change?: number | null;
}) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary">
        {label} · {range}
      </Typography>
      <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{value}</Typography>
        {change !== undefined && <ChangeChip change={change} />}
      </Stack>
    </Box>
  );
}
