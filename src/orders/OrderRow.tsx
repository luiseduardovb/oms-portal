"use client";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeliveryDiningIcon from "@mui/icons-material/DeliveryDining";
import StorefrontIcon from "@mui/icons-material/Storefront";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Paper from "@mui/material/Paper";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useFormatter, useTranslations } from "next-intl";
import { formatMoney } from "@/catalog/money";
import { OrderDetail } from "@/orders/OrderDetail";
import type { OrderSummary } from "@/orders/ordersApi";
import { isStatus, STATUS_COLOR } from "@/orders/status";

/** One order in the list; opens in place to show the full order. */
export function OrderRow({
  order,
  open,
  canAct,
  onToggle,
}: {
  order: OrderSummary;
  open: boolean;
  canAct: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("ordersPage");
  const format = useFormatter();
  const placed = new Date(order.placedAt);
  const delivery = order.fulfillmentType === "delivery";
  const paid = order.paymentStatus === "paid";
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <ButtonBase
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`#${order.publicCode} ${order.customerName}`}
        sx={{
          width: "100%",
          textAlign: "left",
          p: 2,
          display: "grid",
          alignItems: "center",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr auto",
            md: "1fr 1.4fr 1.2fr 1.2fr 1.2fr auto auto",
          },
        }}
      >
        <Box>
          <Typography variant="body2">
            {format.dateTime(placed, { dateStyle: "short" })}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {format.dateTime(placed, { timeStyle: "short" })}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            #{order.publicCode}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {order.customerName}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          {delivery ? (
            <DeliveryDiningIcon fontSize="small" titleAccess={t("delivery")} />
          ) : (
            <StorefrontIcon fontSize="small" titleAccess={t("pickup")} />
          )}
          <Box>
            <Typography variant="body2">
              {delivery ? t("delivery") : t("pickup")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {order.outletName}
            </Typography>
          </Box>
        </Box>
        <Box>
          <Typography variant="body2">
            {t(`payment.${order.paymentMethod === "card" ? "card" : "cash"}`)} ·{" "}
            {paid ? t("payment.paid") : t("payment.unpaid")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatMoney(order.total, order.currencyCode)} ·{" "}
            {t("items", { count: order.itemCount })}
          </Typography>
        </Box>
        <Typography variant="body2">
          {order.scheduledFor
            ? t("scheduled", {
                when: format.dateTime(new Date(order.scheduledFor), {
                  dateStyle: "short",
                  timeStyle: "short",
                }),
              })
            : t("asap")}
        </Typography>
        {isStatus(order.status) ? (
          <Chip
            size="small"
            color={STATUS_COLOR[order.status]}
            label={t(`status.${order.status}`)}
          />
        ) : (
          <Chip size="small" label={order.status} />
        )}
        <ExpandMoreIcon
          sx={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        />
      </ButtonBase>
      <Collapse in={open} unmountOnExit>
        <Box
          sx={{
            p: { xs: 2, md: 3 },
            borderTop: 1,
            borderColor: "divider",
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
          }}
        >
          <OrderDetail id={order.id} canAct={canAct} />
        </Box>
      </Collapse>
    </Paper>
  );
}
