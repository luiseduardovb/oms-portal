"use client";

import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import LinearProgress from "@mui/material/LinearProgress";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import type { ApiError } from "@/api/apiError";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { formatMoney } from "@/catalog/money";
import { PageFrame } from "@/components/PageFrame";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { useBestSellingQuery } from "./analyticsApi";
import { FilterBar } from "./FilterBar";
import { useFilters } from "./useFilters";

/** "Más vendidos": products and categories ranked by what they sold. */
export function BestSellingPage() {
  const t = useTranslations("analytics");
  const errorMessage = useErrorMessage();
  const { data: me } = useMe();
  const { filters, change } = useFilters();
  const result = useBestSellingQuery(filters, { skip: !me });
  if (!me) return null;
  if (!can(me.levels, "analytics", "view")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  const currency = me.merchant.currencyCode;
  const data = result.data;
  const top = Number(data?.products[0]?.sales ?? 0);
  const topCategory = Number(data?.categories[0]?.sales ?? 0);
  return (
    <PageFrame section={t("section")} title={t("best.title")} maxWidth={1200}>
      <FilterBar filters={filters} onChange={change} tax={false} />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t("best.note")}
      </Typography>
      {result.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage(result.error as ApiError)}
        </Alert>
      )}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" },
          alignItems: "start",
        }}
      >
        <Stack sx={{ gap: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {t("best.products")}
          </Typography>
          {result.isLoading &&
            [0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rounded" height={92} />
            ))}
          {data?.products.length === 0 && (
            <Typography color="text.secondary">{t("empty")}</Typography>
          )}
          {data?.products.map((p) => (
            <Card
              key={p.productId}
              variant="outlined"
              sx={{ p: 1.5, display: "flex", gap: 1.5, alignItems: "center" }}
            >
              <Typography
                sx={{ width: 28, fontWeight: 700, color: "text.secondary" }}
              >
                {p.rank}
              </Typography>
              <Avatar
                variant="rounded"
                src={p.imageUrl ?? undefined}
                alt=""
                sx={{ width: 64, height: 64 }}
              >
                {p.name.slice(0, 1)}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontWeight: 600 }}>
                  {p.name}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={top ? (Number(p.sales) / top) * 100 : 0}
                  sx={{ my: 0.75, height: 6, borderRadius: 3 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {t("best.counts", {
                    orders: p.orders,
                    quantity: p.quantity,
                  })}
                </Typography>
              </Box>
              <Typography sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                {formatMoney(p.sales, currency)}
              </Typography>
            </Card>
          ))}
        </Stack>
        <Stack sx={{ gap: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {t("best.categories")}
          </Typography>
          {result.isLoading && <Skeleton variant="rounded" height={160} />}
          {data?.categories.map((c) => (
            <Card key={c.categoryId} variant="outlined" sx={{ p: 1.5 }}>
              <Stack
                direction="row"
                sx={{ justifyContent: "space-between", gap: 1 }}
              >
                <Typography noWrap sx={{ fontWeight: 600 }}>
                  {c.rank}. {c.name}
                </Typography>
                <Typography sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                  {formatMoney(c.sales, currency)}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={topCategory ? (Number(c.sales) / topCategory) * 100 : 0}
                sx={{ my: 0.75, height: 6, borderRadius: 3 }}
              />
              <Typography variant="body2" color="text.secondary">
                {t("best.counts", { orders: c.orders, quantity: c.quantity })}
              </Typography>
            </Card>
          ))}
        </Stack>
      </Box>
    </PageFrame>
  );
}
