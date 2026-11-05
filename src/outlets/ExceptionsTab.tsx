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
import { isValidTime, shortTime } from "./hours";
import { useReplaceExceptionsMutation, type OutletDetail } from "./outletsApi";

interface Row {
  onDate: string;
  isClosed: boolean;
  opensAt: string;
  closesAt: string;
  reason: string;
}

/** Today's date at the outlet, as YYYY-MM-DD. */
export function todayAt(timezone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

interface Props {
  outlet: OutletDetail;
  canEdit: boolean;
}

export function ExceptionsTab({ outlet, canEdit }: Props) {
  const t = useTranslations("outlets.exceptions");
  const common = useTranslations("setup");
  const errorMessage = useErrorMessage();
  const [save, { isLoading, error, isSuccess, reset }] =
    useReplaceExceptionsMutation();
  const today = todayAt(outlet.timezone);
  const [rows, setRows] = useState<Row[]>(() =>
    outlet.exceptions.map((item) => ({
      onDate: item.onDate,
      isClosed: item.isClosed,
      opensAt: item.opensAt ? shortTime(item.opensAt) : "09:00",
      closesAt: item.closesAt ? shortTime(item.closesAt) : "18:00",
      reason: item.reason ?? "",
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
    const dates = rows.map((row) => row.onDate);
    if (dates.some((date) => date === "")) {
      setProblem(t("dateRequired"));
      return;
    }
    if (dates.some((date) => date < today)) {
      setProblem(t("inPast"));
      return;
    }
    if (new Set(dates).size !== dates.length) {
      setProblem(t("duplicate"));
      return;
    }
    for (const row of rows)
      if (
        !row.isClosed &&
        (!isValidTime(row.opensAt) ||
          !isValidTime(row.closesAt) ||
          row.opensAt === row.closesAt)
      ) {
        setProblem(t("timesInvalid", { date: row.onDate }));
        return;
      }
    setProblem(null);
    const sorted = [...rows].sort((a, b) => a.onDate.localeCompare(b.onDate));
    setRows(sorted);
    await save({
      id: outlet.id,
      exceptions: sorted.map((row) => ({
        onDate: row.onDate,
        isClosed: row.isClosed,
        opensAt: row.isClosed ? null : row.opensAt,
        closesAt: row.isClosed ? null : row.closesAt,
        reason: row.reason.trim() || null,
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
                type="date"
                size="small"
                label={t("date")}
                value={row.onDate}
                disabled={!editable}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { min: today, "aria-label": label(t("date")) },
                }}
                onChange={(event) =>
                  update(index, { onDate: event.target.value })
                }
              />
              <FormControlLabel
                label={t("closed")}
                control={
                  <Switch
                    checked={row.isClosed}
                    disabled={!editable}
                    slotProps={{
                      input: { "aria-label": label(t("closed")) },
                    }}
                    onChange={(event) =>
                      update(index, { isClosed: event.target.checked })
                    }
                  />
                }
              />
              {!row.isClosed && (
                <>
                  <TextField
                    type="time"
                    size="small"
                    label={t("opens")}
                    value={row.opensAt}
                    disabled={!editable}
                    slotProps={{
                      inputLabel: { shrink: true },
                      htmlInput: { "aria-label": label(t("opens")) },
                    }}
                    onChange={(event) =>
                      update(index, { opensAt: event.target.value })
                    }
                  />
                  <TextField
                    type="time"
                    size="small"
                    label={t("closes")}
                    value={row.closesAt}
                    disabled={!editable}
                    slotProps={{
                      inputLabel: { shrink: true },
                      htmlInput: { "aria-label": label(t("closes")) },
                    }}
                    onChange={(event) =>
                      update(index, { closesAt: event.target.value })
                    }
                  />
                </>
              )}
              <TextField
                size="small"
                label={t("reason")}
                value={row.reason}
                disabled={!editable}
                slotProps={{
                  htmlInput: {
                    maxLength: 200,
                    "aria-label": label(t("reason")),
                  },
                }}
                onChange={(event) =>
                  update(index, { reason: event.target.value })
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
            onClick={() =>
              setRows((current) => [
                ...current,
                {
                  onDate: "",
                  isClosed: true,
                  opensAt: "09:00",
                  closesAt: "18:00",
                  reason: "",
                },
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
