"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import DeliveryDiningOutlinedIcon from "@mui/icons-material/DeliveryDiningOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ApiError } from "@/api/apiError";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { formatMoney } from "@/catalog/money";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { whatsappLink } from "@/orders/status";
import { day } from "./CustomersPage";
import { useCustomerQuery } from "./customersApi";
import { avatarColor, initials, relativeDay } from "./format";

const STATUS_COLOR: Record<
  string,
  "success" | "error" | "warning" | "info" | "default"
> = {
  completed: "success",
  cancelled: "error",
  pending: "warning",
  accepted: "info",
  ready: "info",
  dispatched: "info",
};

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, borderRadius: 3, flex: "1 1 150px", minWidth: 0 }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 800 }} noWrap>
        {value}
      </Typography>
    </Paper>
  );
}

export function CustomerPage() {
  const t = useTranslations("customers");
  const errorMessage = useErrorMessage();
  const { data: me } = useMe();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const customer = useCustomerQuery(id, {
    skip: !me || !Number.isFinite(id),
    refetchOnMountOrArgChange: true,
  });

  if (!me) return null;
  if (!can(me.levels, "analytics", "view")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  const currency = me.merchant.currencyCode;
  const c = customer.data;
  const average = c ? Number(c.totalSpent) / Math.max(c.ordersCount, 1) : 0;

  return (
    <Stack spacing={3}>
      <Button
        component={Link}
        href="/customers"
        startIcon={<ArrowBackIcon />}
        sx={{ alignSelf: "flex-start" }}
      >
        {t("back")}
      </Button>
      {customer.error && (
        <Alert severity="error">
          {errorMessage(customer.error as ApiError)}
        </Alert>
      )}
      {customer.isLoading && (
        <Stack spacing={2} aria-label={t("loading")}>
          <Skeleton variant="rounded" height={110} />
          <Skeleton variant="rounded" height={80} />
        </Stack>
      )}
      {c && (
        <>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={3}
              sx={{ alignItems: { sm: "center" } }}
            >
              <Avatar
                sx={{
                  bgcolor: avatarColor(c.name),
                  width: 72,
                  height: 72,
                  fontSize: 26,
                  fontWeight: 700,
                }}
              >
                {initials(c.name)}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{ fontWeight: 800 }}
                >
                  {c.name}
                </Typography>
                <Stack
                  direction="row"
                  useFlexGap
                  sx={{ gap: 1, mt: 1, flexWrap: "wrap" }}
                >
                  {c.ordersCount >= 3 && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={t("frequent")}
                    />
                  )}
                  {c.marketing && (
                    <Chip
                      size="small"
                      color="success"
                      icon={<CampaignOutlinedIcon />}
                      label={t("acceptsOffers")}
                    />
                  )}
                  {c.phone && (
                    <Chip
                      size="small"
                      icon={<PhoneOutlinedIcon />}
                      label={c.phone}
                    />
                  )}
                  {c.email && (
                    <Chip
                      size="small"
                      icon={<EmailOutlinedIcon />}
                      label={c.email}
                    />
                  )}
                </Stack>
              </Box>
              {c.phone && (
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<WhatsAppIcon />}
                  component="a"
                  href={whatsappLink(c.phone)}
                  target="_blank"
                  rel="noreferrer"
                  sx={{ borderRadius: 3 }}
                >
                  WhatsApp
                </Button>
              )}
            </Stack>
          </Paper>

          <Stack direction="row" useFlexGap sx={{ gap: 2, flexWrap: "wrap" }}>
            <Tile label={t("columns.orders")} value={String(c.ordersCount)} />
            <Tile
              label={t("columns.spent")}
              value={formatMoney(c.totalSpent, currency)}
            />
            <Tile
              label={t("average")}
              value={formatMoney(average.toFixed(2), currency)}
            />
            <Tile label={t("first")} value={day(c.firstOrderAt)} />
            <Tile
              label={t("columns.last")}
              value={relativeDay(c.lastOrderAt)}
            />
          </Stack>

          <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
            {t("recent")}
          </Typography>
          <Stack spacing={1.5}>
            {c.orders.map((o) => (
              <Paper
                key={o.id}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 3,
                  display: "flex",
                  gap: 2,
                  alignItems: "center",
                }}
              >
                {o.fulfillmentType === "delivery" ? (
                  <DeliveryDiningOutlinedIcon color="action" />
                ) : (
                  <StorefrontOutlinedIcon color="action" />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700 }}>
                    #{o.orderNumber}
                    {"  ·  "}
                    {o.outletName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {day(o.placedAt)}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  color={STATUS_COLOR[o.status] ?? "default"}
                  variant={o.status === "completed" ? "filled" : "outlined"}
                  label={t(`order.statuses.${o.status}`)}
                />
                <Typography
                  sx={{ fontWeight: 800, minWidth: 96, textAlign: "right" }}
                >
                  {formatMoney(o.total, currency)}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </>
      )}
    </Stack>
  );
}
