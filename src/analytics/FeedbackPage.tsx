"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Pagination from "@mui/material/Pagination";
import Rating from "@mui/material/Rating";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { PageFrame } from "@/components/PageFrame";
import { useErrorMessage } from "@/lib/useErrorMessage";
import {
  downloadFeedback,
  useFeedbackListQuery,
  useFeedbackSummaryQuery,
} from "./feedbackApi";
import { FilterBar } from "./FilterBar";
import { useFilters } from "./useFilters";

const PER_PAGE = 20;

/** "Comentarios": what customers wrote, private to the team. */
export function FeedbackPage() {
  const t = useTranslations("analytics");
  const errorMessage = useErrorMessage();
  const { data: me } = useMe();
  const { filters, change } = useFilters();
  const [rating, setRating] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const scope = {
    from: filters.from,
    to: filters.to,
    outletId: filters.outletId,
  };
  const summary = useFeedbackSummaryQuery(scope, { skip: !me });
  const list = useFeedbackListQuery(
    { ...scope, rating, page, itemsPerPage: PER_PAGE },
    { skip: !me },
  );
  if (!me) return null;
  if (!can(me.levels, "analytics", "view")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  const stats = summary.data;
  const failure = (summary.error ?? list.error) as ApiError | undefined;
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString("es-HN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return (
    <PageFrame
      section={t("section")}
      title={t("feedback.title")}
      maxWidth={1100}
      actions={
        <Button
          variant="outlined"
          onClick={() => void downloadFeedback({ ...scope, rating })}
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
      {failure && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage(failure)}
        </Alert>
      )}
      <Card variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        {stats ? (
          <Box
            sx={{
              display: "grid",
              gap: 3,
              gridTemplateColumns: { xs: "1fr", sm: "200px 1fr" },
              alignItems: "center",
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 44, fontWeight: 700, lineHeight: 1 }}>
                {stats.average === null || stats.average === undefined
                  ? "—"
                  : stats.average.toLocaleString("es-HN", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 2,
                    })}
              </Typography>
              <Rating
                readOnly
                precision={0.1}
                value={stats.average ?? 0}
                aria-label={t("feedback.average")}
              />
              <Typography variant="body2" color="text.secondary">
                {t("feedback.count", { count: stats.count })}
              </Typography>
            </Box>
            <Stack sx={{ gap: 0.75 }}>
              {stats.stars.map((s) => (
                <Stack
                  key={s.rating}
                  direction="row"
                  sx={{ alignItems: "center", gap: 1.5 }}
                >
                  <Typography sx={{ width: 28 }}>{s.rating}★</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={stats.count ? (s.count / stats.count) * 100 : 0}
                    sx={{ flex: 1, height: 8, borderRadius: 4 }}
                  />
                  <Typography sx={{ width: 36, textAlign: "right" }}>
                    {s.count}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        ) : (
          <Skeleton variant="rounded" height={140} />
        )}
      </Card>

      <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap", mb: 2 }}>
        <Chip
          label={t("feedback.all")}
          color={rating === null ? "primary" : "default"}
          onClick={() => {
            setRating(null);
            setPage(1);
          }}
        />
        {[5, 4, 3, 2, 1].map((n) => (
          <Chip
            key={n}
            label={`${n}★`}
            color={rating === n ? "primary" : "default"}
            onClick={() => {
              setRating(n);
              setPage(1);
            }}
          />
        ))}
      </Stack>

      <Stack sx={{ gap: 1.5 }}>
        {list.isLoading && <Skeleton variant="rounded" height={100} />}
        {list.data?.results.length === 0 && (
          <Typography color="text.secondary">{t("feedback.empty")}</Typography>
        )}
        {list.data?.results.map((f) => (
          <Card key={f.id} variant="outlined" sx={{ p: 2 }}>
            <Stack
              direction="row"
              sx={{
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <Rating readOnly value={f.rating} aria-label={`${f.rating}★`} />
              <Typography variant="body2" color="text.secondary">
                {day(f.createdAt)}
              </Typography>
            </Stack>
            <Typography sx={{ my: 1, whiteSpace: "pre-wrap" }}>
              {f.comment ?? (
                <Box component="span" sx={{ color: "text.secondary" }}>
                  {t("feedback.noComment")}
                </Box>
              )}
            </Typography>
            <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
              {f.orderNumber ? (
                <Chip
                  size="small"
                  label={t("feedback.order", { number: f.orderNumber })}
                />
              ) : (
                <Chip
                  size="small"
                  variant="outlined"
                  label={t("feedback.general")}
                />
              )}
              {f.outletName && <Chip size="small" label={f.outletName} />}
              {f.customerName && (
                <Chip size="small" variant="outlined" label={f.customerName} />
              )}
              {f.customerPhone && (
                <Chip size="small" variant="outlined" label={f.customerPhone} />
              )}
            </Stack>
          </Card>
        ))}
      </Stack>
      {(list.data?.totalPages ?? 0) > 1 && (
        <Pagination
          sx={{ mt: 2 }}
          count={list.data?.totalPages}
          page={page}
          onChange={(_e, value) => setPage(value)}
        />
      )}
    </PageFrame>
  );
}
