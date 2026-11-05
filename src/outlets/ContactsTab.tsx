"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { useReplaceContactsMutation, type OutletDetail } from "./outletsApi";

const PHONE = /^\+[1-9]\d{7,14}$/;
export const MAX_CONTACTS = 5;

interface Row {
  phone: string;
  label: string;
  active: boolean;
}

interface Props {
  outlet: OutletDetail;
  canEdit: boolean;
}

export function ContactsTab({ outlet, canEdit }: Props) {
  const t = useTranslations("outlets.contacts");
  const common = useTranslations("setup");
  const errorMessage = useErrorMessage();
  const [save, { isLoading, error, isSuccess, reset }] =
    useReplaceContactsMutation();
  const [rows, setRows] = useState<Row[]>(() =>
    outlet.alertContacts.map((contact) => ({
      phone: contact.phone,
      label: contact.label ?? "",
      active: contact.active ?? true,
    })),
  );
  const [problem, setProblem] = useState<string | null>(null);
  const editable = canEdit && outlet.archivedAt === null;

  const update = (index: number, patch: Partial<Row>) =>
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );

  const submit = async () => {
    reset();
    const phones = rows.map((row) => row.phone.trim());
    if (phones.some((phone) => !PHONE.test(phone))) {
      setProblem(t("phoneInvalid"));
      return;
    }
    if (new Set(phones).size !== phones.length) {
      setProblem(t("duplicate"));
      return;
    }
    setProblem(null);
    await save({
      id: outlet.id,
      alertContacts: rows.map((row) => ({
        phone: row.phone.trim(),
        label: row.label.trim() || null,
        active: row.active,
      })),
    });
  };

  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">{t("help")}</Typography>
      {problem && <Alert severity="error">{problem}</Alert>}
      {error && (
        <Alert severity="error">{errorMessage(error as ApiError)}</Alert>
      )}
      {isSuccess && <Alert severity="success">{common("saved")}</Alert>}
      {rows.length === 0 && (
        <Typography color="text.secondary">{t("empty")}</Typography>
      )}
      {rows.map((row, index) => {
        const label = (what: string) => `${what} ${index + 1}`;
        return (
          <Paper key={index} variant="outlined" sx={{ p: 2 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              sx={{ alignItems: { md: "center" } }}
            >
              <TextField
                size="small"
                label={t("phone")}
                value={row.phone}
                placeholder="+50499998888"
                disabled={!editable}
                slotProps={{ htmlInput: { "aria-label": label(t("phone")) } }}
                onChange={(event) =>
                  update(index, { phone: event.target.value })
                }
              />
              <TextField
                size="small"
                label={t("label")}
                value={row.label}
                disabled={!editable}
                slotProps={{
                  htmlInput: { maxLength: 60, "aria-label": label(t("label")) },
                }}
                onChange={(event) =>
                  update(index, { label: event.target.value })
                }
              />
              <FormControlLabel
                label={t("active")}
                control={
                  <Switch
                    checked={row.active}
                    disabled={!editable}
                    slotProps={{ input: { "aria-label": label(t("active")) } }}
                    onChange={(event) =>
                      update(index, { active: event.target.checked })
                    }
                  />
                }
              />
              {editable && (
                <IconButton
                  aria-label={label(t("remove"))}
                  onClick={() =>
                    setRows((current) => current.filter((_r, i) => i !== index))
                  }
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Stack>
          </Paper>
        );
      })}
      {editable && (
        <Stack direction="row" spacing={2}>
          <Button
            disabled={rows.length >= MAX_CONTACTS}
            onClick={() =>
              setRows((current) => [
                ...current,
                { phone: "", label: "", active: true },
              ])
            }
          >
            {t("add")}
          </Button>
          <Button variant="contained" onClick={submit} disabled={isLoading}>
            {isLoading ? common("saving") : common("save")}
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
