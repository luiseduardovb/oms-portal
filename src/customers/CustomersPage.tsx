"use client";

import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import SearchIcon from "@mui/icons-material/Search";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TablePagination from "@mui/material/TablePagination";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ApiError } from "@/api/apiError";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { formatMoney } from "@/catalog/money";
import { useErrorMessage } from "@/lib/useErrorMessage";
import {
  downloadCustomers,
  useCustomerSummaryQuery,
  useCustomersQuery,
  type CustomerFilters,
  type CustomerRow,
  type CustomerSort,
} from "./customersApi";
import { avatarColor, initials, percent, relativeDay } from "./format";

export function day(value: string): string {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value?: string;
  hint?: string;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2.5, borderRadius: 3, flex: "1 1 200px", minWidth: 0 }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      {value === undefined ? (
        <Skeleton width="60%" height={44} />
      ) : (
        <Typography
          sx={{ fontSize: 30, fontWeight: 800, lineHeight: 1.3 }}
          noWrap
        >
          {value}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary">
        {hint ?? " "}
      </Typography>
    </Paper>
  );
}

function CustomerCard({
  customer: c,
  currency,
  now,
}: {
  customer: CustomerRow;
  currency: string;
  now: Date;
}) {
  const t = useTranslations("customers");
  const contact = [c.phone, c.email].filter(Boolean).join("  ·  ");
  return (
    <Paper
      variant="outlined"
      component={Link}
      href={`/customers/${c.id}`}
      sx={{
        p: 2,
        borderRadius: 3,
        display: "flex",
        gap: 2,
        alignItems: "center",
        flexWrap: { xs: "wrap", sm: "nowrap" },
        color: "inherit",
        textDecoration: "none",
        transition: "border-color .15s, box-shadow .15s",
        "&:hover": {
          borderColor: "primary.main",
          boxShadow: "0 4px 16px rgba(0,0,0,.06)",
        },
      }}
    >
      <Avatar
        sx={{
          bgcolor: avatarColor(c.name),
          width: 48,
          height: 48,
          fontWeight: 700,
        }}
      >
        {initials(c.name)}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Typography sx={{ fontWeight: 700 }} noWrap>
            {c.name}
          </Typography>
          {c.ordersCount >= 3 && (
            <Chip size="small" label={t("frequent")} variant="outlined" />
          )}
          {c.marketing && (
            <Chip
              size="small"
              color="success"
              icon={<CampaignOutlinedIcon />}
              label={t("acceptsOffers")}
            />
          )}
        </Stack>
        {contact && (
          <Typography variant="body2" color="text.secondary" noWrap>
            {contact}
          </Typography>
        )}
      </Box>
      <Box sx={{ textAlign: "right", minWidth: 150 }}>
        <Typography sx={{ fontWeight: 800 }}>
          {formatMoney(c.totalSpent, currency)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("ordersCount", { count: c.ordersCount })}
          {"  ·  "}
          {relativeDay(c.lastOrderAt, now)}
        </Typography>
      </Box>
    </Paper>
  );
}

export function CustomersPage() {
  const t = useTranslations("customers");
  const errorMessage = useErrorMessage();
  const { data: me } = useMe();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [marketing, setMarketing] =
    useState<CustomerFilters["marketing"]>("all");
  const [sort, setSort] = useState<CustomerSort>("last");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [failure, setFailure] = useState<string | null>(null);
  const [now] = useState(() => new Date());

  // The list follows the search box a moment after typing stops.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const list = useCustomersQuery(
    { q, marketing, sort, page, itemsPerPage: perPage },
    { skip: !me, refetchOnMountOrArgChange: true },
  );
  const summary = useCustomerSummaryQuery(undefined, {
    skip: !me,
    refetchOnMountOrArgChange: true,
  });

  if (!me) return null;
  if (!can(me.levels, "analytics", "view")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  const currency = me.merchant.currencyCode;
  const data = list.data;
  const s = summary.data;

  const exportFile = async () => {
    setFailure(null);
    try {
      await downloadCustomers({ q, marketing, sort });
    } catch (error) {
      setFailure(errorMessage(error as ApiError));
    }
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
            {t("title")}
          </Typography>
          <Typography color="text.secondary">{t("subtitle")}</Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => void exportFile()}
          sx={{ borderRadius: 3, flexShrink: 0 }}
        >
          {t("export")}
        </Button>
      </Stack>

      {(list.error || failure) && (
        <Alert severity="error">
          {failure ?? errorMessage(list.error as ApiError)}
        </Alert>
      )}

      <Stack direction="row" useFlexGap sx={{ gap: 2, flexWrap: "wrap" }}>
        <Stat
          label={t("stats.customers")}
          value={s ? String(s.customers) : undefined}
        />
        <Stat
          label={t("stats.returning")}
          value={s ? String(s.returning) : undefined}
          hint={
            s
              ? t("stats.ofThem", { share: percent(s.returning, s.customers) })
              : undefined
          }
        />
        <Stat
          label={t("stats.marketing")}
          value={s ? String(s.marketing) : undefined}
          hint={
            s
              ? t("stats.ofThem", { share: percent(s.marketing, s.customers) })
              : undefined
          }
        />
        <Stat
          label={t("stats.spent")}
          value={s ? formatMoney(s.totalSpent, currency) : undefined}
        />
      </Stack>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ alignItems: { md: "center" } }}
      >
        <TextField
          size="small"
          placeholder={t("search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              sx: { borderRadius: 3 },
            },
            htmlInput: { "aria-label": t("searchLabel") },
          }}
          sx={{ flex: 1 }}
        />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={marketing}
          onChange={(_, value: CustomerFilters["marketing"] | null) => {
            if (value) {
              setMarketing(value);
              setPage(1);
            }
          }}
          aria-label={t("marketing.label")}
        >
          <ToggleButton value="all">{t("marketing.all")}</ToggleButton>
          <ToggleButton value="yes">{t("marketing.yes")}</ToggleButton>
        </ToggleButtonGroup>
        <TextField
          select
          size="small"
          label={t("sort.label")}
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as CustomerSort);
            setPage(1);
          }}
          sx={{ minWidth: 190 }}
          slotProps={{ input: { sx: { borderRadius: 3 } } }}
        >
          {(["last", "spent", "orders", "name"] as const).map((value) => (
            <MenuItem key={value} value={value}>
              {t(`sort.${value}`)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {list.isLoading ? (
        <Stack spacing={1.5} aria-label={t("loading")}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={82} />
          ))}
        </Stack>
      ) : !data || data.results.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{ p: 6, textAlign: "center", borderRadius: 3 }}
        >
          <Typography color="text.secondary">
            {q || marketing !== "all" ? t("noMatches") : t("empty")}
          </Typography>
        </Paper>
      ) : (
        <>
          <Stack spacing={1.5}>
            {data.results.map((c) => (
              <CustomerCard
                key={c.id}
                customer={c}
                currency={currency}
                now={now}
              />
            ))}
          </Stack>
          <TablePagination
            component="div"
            count={data.totalCount}
            page={page - 1}
            rowsPerPage={perPage}
            rowsPerPageOptions={[25, 50, 100]}
            onPageChange={(_, value) => setPage(value + 1)}
            onRowsPerPageChange={(e) => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
            labelRowsPerPage={t("perPage")}
          />
        </>
      )}
    </Stack>
  );
}
