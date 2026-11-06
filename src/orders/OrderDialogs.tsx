"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { CancelReason } from "@/orders/ordersApi";

const REASONS: CancelReason[] = [
  "out_of_stock",
  "too_busy",
  "customer_request",
  "cannot_deliver",
  "other",
];

export function CancelDialog({
  busy,
  onClose,
  onConfirm,
}: {
  busy: boolean;
  onClose: () => void;
  onConfirm: (reasonCode: CancelReason, note: string) => void;
}) {
  const t = useTranslations("ordersPage.cancel");
  const [reason, setReason] = useState<CancelReason>("customer_request");
  const [note, setNote] = useState("");
  const missingNote = reason === "other" && note.trim() === "";
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t("title")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            select
            label={t("reason")}
            value={reason}
            onChange={(event) => setReason(event.target.value as CancelReason)}
          >
            {REASONS.map((code) => (
              <MenuItem key={code} value={code}>
                {t(`reasons.${code}`)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t("note")}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            multiline
            minRows={2}
            slotProps={{ htmlInput: { maxLength: 200 } }}
            error={missingNote}
            helperText={missingNote ? t("noteRequired") : undefined}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("back")}</Button>
        <Button
          color="error"
          variant="contained"
          disabled={busy || missingNote}
          onClick={() => onConfirm(reason, note.trim())}
        >
          {t("confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function DispatchDialog({
  busy,
  onClose,
  onConfirm,
}: {
  busy: boolean;
  onClose: () => void;
  onConfirm: (driverName: string, driverPhone: string) => void;
}) {
  const t = useTranslations("ordersPage.dispatch");
  const back = useTranslations("ordersPage.cancel")("back");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t("title")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={t("driverName")}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            label={t("driverPhone")}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{back}</Button>
        <Button
          variant="contained"
          disabled={busy}
          onClick={() => onConfirm(name.trim(), phone.trim())}
        >
          {t("confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
