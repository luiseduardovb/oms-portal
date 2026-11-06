"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import type { ApiError } from "@/api/apiError";
import { formatMoney } from "@/catalog/money";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { useAppDispatch } from "@/store/hooks";
import { CancelDialog, DispatchDialog } from "@/orders/OrderDialogs";
import {
  useCancelOrderMutation,
  useOrderActionMutation,
  ordersApi,
  useOrderQuery,
  type OrderDetail as Detail,
} from "@/orders/ordersApi";
import { canCancel, mapLink, nextAction, whatsappLink } from "@/orders/status";

function Money({ label, value, cur, bold }: MoneyProps) {
  return (
    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
      <Typography variant="body2" sx={{ fontWeight: bold ? 700 : 400 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: bold ? 700 : 400 }}>
        {formatMoney(value, cur)}
      </Typography>
    </Stack>
  );
}
interface MoneyProps {
  label: string;
  value: string;
  cur: string;
  bold?: boolean;
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard blocked: nothing else to do.
  }
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: 1,
          borderColor: "divider",
          pb: 1,
          mb: 1.5,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {action}
      </Stack>
      {children}
    </Box>
  );
}

function CopyLink({ label, text }: { label: string; text: string }) {
  return (
    <Button
      size="small"
      startIcon={<ContentCopyIcon fontSize="small" />}
      onClick={() => void copy(text)}
    >
      {label}
    </Button>
  );
}

function Photo({
  url,
  name,
}: {
  url: string | null | undefined;
  name: string;
}) {
  return (
    <Box
      sx={{
        width: 56,
        height: 56,
        flexShrink: 0,
        borderRadius: 1,
        overflow: "hidden",
        bgcolor: "action.hover",
        display: "grid",
        placeItems: "center",
        color: "text.disabled",
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={name}
          width={56}
          height={56}
          style={{ objectFit: "cover" }}
        />
      ) : (
        <ImageOutlinedIcon />
      )}
    </Box>
  );
}

function Body({ order, canAct }: { order: Detail; canAct: boolean }) {
  const t = useTranslations("ordersPage");
  const format = useFormatter();
  const errorMessage = useErrorMessage();
  const [act, acting] = useOrderActionMutation();
  const [cancel, cancelling] = useCancelOrderMutation();
  const dispatch = useAppDispatch();
  const [dialog, setDialog] = useState<"cancel" | "dispatch" | null>(null);
  // After a refused change (someone else moved the order first) reload it.
  const reload = () => {
    dispatch(
      ordersApi.util.invalidateTags([
        "Orders",
        "OrderCounts",
        { type: "Order", id: order.id },
      ]),
    );
  };
  const cur = order.currencyCode;
  const next = nextAction(order.status, order.fulfillmentType);
  const error = (acting.error ?? cancelling.error) as ApiError | undefined;
  const busy = acting.isLoading || cancelling.isLoading;

  const run = (action: NonNullable<typeof next>) => {
    if (action === "dispatch") {
      setDialog("dispatch");
      return;
    }
    void act({ id: order.id, action, version: order.version })
      .unwrap()
      .catch(reload);
  };
  const done = () => setDialog(null);
  const failed = () => {
    setDialog(null);
    reload();
  };

  return (
    <Box
      sx={{
        display: "grid",
        gap: 4,
        gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
        alignItems: "start",
      }}
    >
      <Stack spacing={2}>
        {error && <Alert severity="error">{errorMessage(error)}</Alert>}
        <Section title={t("detail.items")}>
          <Stack spacing={2}>
            {order.lines.map((line) => (
              <Stack key={line.id} direction="row" spacing={2}>
                <Photo url={line.imageUrl} name={line.productName} />
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600 }}>
                    {line.quantity}× {line.productName}
                  </Typography>
                  {line.options.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {line.options.map((o) => o.optionName).join(", ")}
                    </Typography>
                  )}
                  {line.notes && (
                    <Typography variant="caption" sx={{ display: "block" }}>
                      {line.notes}
                    </Typography>
                  )}
                </Box>
                <Typography sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                  {formatMoney(line.lineAmount, cur)}
                </Typography>
              </Stack>
            ))}
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Stack spacing={0.75}>
            <Money
              label={t("detail.subtotal")}
              value={order.itemsTotal}
              cur={cur}
            />
            {Number(order.discountTotal) > 0 && (
              <Money
                label={t("detail.discount")}
                value={order.discountTotal}
                cur={cur}
              />
            )}
            {Number(order.deliveryFee) > 0 && (
              <Money
                label={t("detail.deliveryFee")}
                value={order.deliveryFee}
                cur={cur}
              />
            )}
            {Number(order.taxAdded) > 0 && (
              <Money label={order.taxLabel} value={order.taxAdded} cur={cur} />
            )}
            {Number(order.tipAmount) > 0 && (
              <Money
                label={t("detail.tip")}
                value={order.tipAmount}
                cur={cur}
              />
            )}
            <Money
              label={t("detail.total")}
              value={order.total}
              cur={cur}
              bold
            />
            {order.paymentMethod === "cash" && order.cashPayWith && (
              <Typography variant="caption" color="text.secondary">
                {t("detail.cashPayWith", {
                  amount: formatMoney(order.cashPayWith, cur),
                })}
              </Typography>
            )}
          </Stack>
        </Section>
        {canAct && (next || canCancel(order.status)) && (
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", pt: 1 }}
          >
            {canCancel(order.status) ? (
              <Button
                color="error"
                variant="outlined"
                disabled={busy}
                onClick={() => setDialog("cancel")}
              >
                {t("actions.cancel")}
              </Button>
            ) : (
              <span />
            )}
            {next && (
              <Button
                variant="contained"
                disabled={busy}
                onClick={() => run(next)}
              >
                {t(`actions.${next}`)}
              </Button>
            )}
          </Stack>
        )}
      </Stack>
      <Stack spacing={3}>
        {order.deliveryAddressText && (
          <Section
            title={t("detail.address")}
            action={
              <CopyLink
                label={t("copy.address")}
                text={order.deliveryAddressText}
              />
            }
          >
            <Typography variant="body2">{order.deliveryAddressText}</Typography>
            {order.deliveryReference && (
              <Typography variant="body2" color="text.secondary">
                {order.deliveryReference}
              </Typography>
            )}
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                color="inherit"
                component="a"
                href={mapLink(order.deliveryAddressText)}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ flex: 1 }}
              >
                {t("map")}
              </Button>
              {order.customerPhone && (
                <Button
                  variant="outlined"
                  color="inherit"
                  component="a"
                  href={whatsappLink(order.customerPhone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<WhatsAppIcon />}
                  sx={{ flex: 1 }}
                >
                  {t("whatsapp")}
                </Button>
              )}
            </Stack>
          </Section>
        )}
        <Section
          title={t("detail.contact")}
          action={
            order.customerPhone ? (
              <CopyLink label={t("copy.phone")} text={order.customerPhone} />
            ) : undefined
          }
        >
          {order.customerPhone && (
            <Typography
              component="a"
              href={`tel:${order.customerPhone}`}
              color="primary"
              sx={{ textDecoration: "none", display: "block" }}
            >
              {order.customerPhone}
            </Typography>
          )}
          <Typography variant="body2">{order.customerName}</Typography>
          {!order.deliveryAddressText && order.customerPhone && (
            <Button
              size="small"
              sx={{ mt: 1 }}
              component="a"
              href={whatsappLink(order.customerPhone)}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<WhatsAppIcon />}
            >
              {t("whatsapp")}
            </Button>
          )}
        </Section>
        {order.customerNotes && (
          <Section title={t("detail.notes")}>
            <Typography variant="body2">{order.customerNotes}</Typography>
          </Section>
        )}
        {order.driverName && (
          <Section title={t("detail.driver")}>
            <Typography variant="body2">
              {[order.driverName, order.driverPhone]
                .filter(Boolean)
                .join(" · ")}
            </Typography>
          </Section>
        )}
        <Section title={t("detail.timeline")}>
          <Stack spacing={1} divider={<Divider flexItem />}>
            {order.history.map((step, index) => (
              <Stack
                key={`${step.status}-${index}`}
                direction="row"
                sx={{ justifyContent: "space-between", gap: 2 }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {t(`status.${step.status}`)}
                  </Typography>
                  {(step.actorName || step.reason) && (
                    <Typography variant="caption" color="text.secondary">
                      {[
                        step.actorName
                          ? t("detail.by", { name: step.actorName })
                          : null,
                        step.reason,
                      ]
                        .filter(Boolean)
                        .join(" — ")}
                    </Typography>
                  )}
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ whiteSpace: "nowrap" }}
                >
                  {format.dateTime(new Date(step.at), {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Section>
      </Stack>
      {dialog === "cancel" && (
        <CancelDialog
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={(reasonCode, note) =>
            void cancel({
              id: order.id,
              version: order.version,
              reasonCode,
              note,
            })
              .unwrap()
              .then(done, failed)
          }
        />
      )}
      {dialog === "dispatch" && (
        <DispatchDialog
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={(driverName, driverPhone) =>
            void act({
              id: order.id,
              action: "dispatch",
              version: order.version,
              driverName: driverName || undefined,
              driverPhone: driverPhone || undefined,
            })
              .unwrap()
              .then(done, failed)
          }
        />
      )}
    </Box>
  );
}

/** The expanded part of an order row: full order, contact and actions. */
export function OrderDetail({ id, canAct }: { id: number; canAct: boolean }) {
  const t = useTranslations("ordersPage.detail");
  const errorMessage = useErrorMessage();
  const { data, error } = useOrderQuery(id);
  if (error) {
    return <Alert severity="error">{errorMessage(error as ApiError)}</Alert>;
  }
  if (!data) {
    return (
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <CircularProgress size={18} />
        <Typography variant="body2">{t("loading")}</Typography>
      </Stack>
    );
  }
  return <Body order={data} canAct={canAct} />;
}
