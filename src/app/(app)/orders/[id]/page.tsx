"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeliveryDiningOutlinedIcon from "@mui/icons-material/DeliveryDiningOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useFormatter, useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { formatMoney } from "@/catalog/money";
import { OrderDetail } from "@/orders/OrderDetail";
import { useOrderQuery } from "@/orders/ordersApi";
import { STATUS_COLOR, isStatus } from "@/orders/status";

/** One order on its own page, reached from a customer's history: a header
 * with what matters at a glance, then the full order across the screen. */
export default function OrderPage() {
  const t = useTranslations("ordersPage");
  const format = useFormatter();
  const router = useRouter();
  const { data: me } = useMe();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const allowed = !!me && can(me.levels, "orders", "view");
  const order = useOrderQuery(id, {
    skip: !allowed || !Number.isFinite(id),
  }).data;

  if (!me) return null;
  if (!allowed) return <Alert severity="warning">{t("noAccess")}</Alert>;
  if (!Number.isFinite(id)) return null;

  const delivery = order?.fulfillmentType === "delivery";
  return (
    <Stack spacing={3} sx={{ maxWidth: 1240 }}>
      <Button
        onClick={() => router.back()}
        startIcon={<ArrowBackIcon />}
        sx={{ alignSelf: "flex-start", ml: -1 }}
      >
        {t("back")}
      </Button>
      {order ? (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{
            alignItems: { sm: "center" },
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: "center", flexWrap: "wrap" }}
            >
              <Typography
                variant="h4"
                component="h1"
                sx={{ fontWeight: 800, fontSize: { xs: 26, md: 32 } }}
              >
                {t("orderTitle", { number: order.orderNumber })}
              </Typography>
              <Chip
                color={
                  isStatus(order.status)
                    ? STATUS_COLOR[order.status]
                    : "default"
                }
                variant={order.status === "completed" ? "filled" : "outlined"}
                label={
                  isStatus(order.status)
                    ? t(`status.${order.status}`)
                    : order.status
                }
              />
            </Stack>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                mt: 0.5,
                alignItems: "center",
                color: "text.secondary",
              }}
            >
              {delivery ? (
                <DeliveryDiningOutlinedIcon fontSize="small" />
              ) : (
                <StorefrontOutlinedIcon fontSize="small" />
              )}
              <Typography variant="body2">
                {[
                  t(delivery ? "fulfillment.delivery" : "fulfillment.pickup"),
                  order.outletName,
                  format.dateTime(new Date(order.placedAt), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                ].join("  ·  ")}
              </Typography>
            </Stack>
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: 26, md: 32 } }}>
            {formatMoney(order.total, order.currencyCode)}
          </Typography>
        </Stack>
      ) : null}
      <OrderDetail id={id} canAct={can(me.levels, "orders", "full")} framed />
    </Stack>
  );
}
