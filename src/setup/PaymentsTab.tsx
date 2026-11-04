"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { useSetPaymentMethodsMutation, type StoreSetup } from "./setupApi";

interface Props {
  setup: StoreSetup;
  canEdit: boolean;
}

export function PaymentsTab({ setup, canEdit }: Props) {
  const t = useTranslations("setup");
  const errorMessage = useErrorMessage();
  const [save, { isLoading, error, isSuccess, reset }] =
    useSetPaymentMethodsMutation();
  const [cash, setCash] = useState(setup.paymentMethods.cashOnDelivery);
  const [card, setCard] = useState(setup.paymentMethods.cardOnDelivery);
  const [none, setNone] = useState(false);

  const submit = async () => {
    reset();
    if (!cash && !card) {
      setNone(true);
      return;
    }
    setNone(false);
    await save({ cashOnDelivery: cash, cardOnDelivery: card });
  };

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h6" component="h2">
          {t("payments.section")}
        </Typography>
        <Typography color="text.secondary">{t("payments.help")}</Typography>
        {none && <Alert severity="error">{t("payments.noMethod")}</Alert>}
        {error && (
          <Alert severity="error">{errorMessage(error as ApiError)}</Alert>
        )}
        {isSuccess && <Alert severity="success">{t("saved")}</Alert>}
        <FormControlLabel
          control={
            <Switch
              checked={cash}
              disabled={!canEdit}
              onChange={(event) => setCash(event.target.checked)}
            />
          }
          label={t("payments.cashOnDelivery")}
        />
        <FormControlLabel
          control={
            <Switch
              checked={card}
              disabled={!canEdit}
              onChange={(event) => setCard(event.target.checked)}
            />
          }
          label={t("payments.cardOnDelivery")}
        />
        {canEdit && (
          <Button
            variant="contained"
            onClick={submit}
            disabled={isLoading}
            sx={{ alignSelf: "flex-start" }}
          >
            {isLoading ? t("saving") : t("save")}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
