"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { useErrorMessage } from "@/lib/useErrorMessage";
import {
  findOverlap,
  isValidTime,
  minutes,
  passesMidnight,
  weekFromApi,
  weekToApi,
  WEEKDAYS,
  type Week,
} from "./hours";
import { useReplaceHoursMutation, type OutletDetail } from "./outletsApi";

interface Props {
  outlet: OutletDetail;
  canEdit: boolean;
}

export function HoursTab({ outlet, canEdit }: Props) {
  const t = useTranslations("outlets.hours");
  const common = useTranslations("setup");
  const errorMessage = useErrorMessage();
  const [save, { isLoading, error, isSuccess, reset }] =
    useReplaceHoursMutation();
  const [week, setWeek] = useState<Week>(() => weekFromApi(outlet.hours));
  const [problem, setProblem] = useState<string | null>(null);
  const [copyFrom, setCopyFrom] = useState<number | null>(null);
  const [copyTo, setCopyTo] = useState<number[]>([]);
  const editable = canEdit && outlet.archivedAt === null;

  const change = (weekday: number, next: Week[number]) =>
    setWeek((current) => ({ ...current, [weekday]: next }));

  const submit = async () => {
    reset();
    for (const weekday of WEEKDAYS)
      for (const interval of week[weekday] ?? []) {
        if (!isValidTime(interval.opensAt) || !isValidTime(interval.closesAt)) {
          setProblem(t("timeRequired", { day: t(`day.${weekday}`) }));
          return;
        }
        if (interval.opensAt === interval.closesAt) {
          setProblem(t("sameTime", { day: t(`day.${weekday}`) }));
          return;
        }
      }
    const clash = findOverlap(week);
    if (clash) {
      setProblem(
        t("overlap", { a: t(`day.${clash[0]}`), b: t(`day.${clash[1]}`) }),
      );
      return;
    }
    setProblem(null);
    const sorted: Week = {};
    for (const weekday of WEEKDAYS)
      sorted[weekday] = [...(week[weekday] ?? [])].sort(
        (a, b) => minutes(a.opensAt) - minutes(b.opensAt),
      );
    setWeek(sorted);
    await save({ id: outlet.id, hours: weekToApi(sorted) });
  };

  const copy = () => {
    if (copyFrom === null) return;
    const source = week[copyFrom] ?? [];
    setWeek((current) => {
      const next = { ...current };
      for (const weekday of copyTo)
        next[weekday] = source.map((interval) => ({ ...interval }));
      return next;
    });
    setCopyFrom(null);
    setCopyTo([]);
  };

  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">{t("help")}</Typography>
      {problem && <Alert severity="error">{problem}</Alert>}
      {error && (
        <Alert severity="error">{errorMessage(error as ApiError)}</Alert>
      )}
      {isSuccess && <Alert severity="success">{common("saved")}</Alert>}
      {WEEKDAYS.map((weekday) => {
        const intervals = week[weekday] ?? [];
        return (
          <Paper key={weekday} variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle1" component="h3">
                {t(`day.${weekday}`)}
              </Typography>
              {intervals.length === 0 && (
                <Typography color="text.secondary">{t("closed")}</Typography>
              )}
              {intervals.map((interval, index) => {
                const label = (what: string) =>
                  `${what} ${t(`day.${weekday}`)} ${index + 1}`;
                const update = (patch: Partial<typeof interval>) =>
                  change(
                    weekday,
                    intervals.map((item, i) =>
                      i === index ? { ...item, ...patch } : item,
                    ),
                  );
                return (
                  <Stack
                    key={index}
                    direction="row"
                    spacing={2}
                    sx={{ alignItems: "center" }}
                  >
                    <TextField
                      type="time"
                      size="small"
                      label={t("opens")}
                      value={interval.opensAt}
                      disabled={!editable}
                      slotProps={{
                        inputLabel: { shrink: true },
                        htmlInput: { "aria-label": label(t("opens")) },
                      }}
                      onChange={(event) =>
                        update({ opensAt: event.target.value })
                      }
                    />
                    <TextField
                      type="time"
                      size="small"
                      label={t("closes")}
                      value={interval.closesAt}
                      disabled={!editable}
                      slotProps={{
                        inputLabel: { shrink: true },
                        htmlInput: { "aria-label": label(t("closes")) },
                      }}
                      onChange={(event) =>
                        update({ closesAt: event.target.value })
                      }
                    />
                    {isValidTime(interval.opensAt) &&
                      isValidTime(interval.closesAt) &&
                      passesMidnight(interval) && (
                        <Typography variant="body2" color="text.secondary">
                          {t("nextDay")}
                        </Typography>
                      )}
                    {editable && (
                      <IconButton
                        aria-label={label(t("remove"))}
                        onClick={() =>
                          change(
                            weekday,
                            intervals.filter((_item, i) => i !== index),
                          )
                        }
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Stack>
                );
              })}
              {editable && (
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    onClick={() =>
                      change(weekday, [
                        ...intervals,
                        { opensAt: "09:00", closesAt: "18:00" },
                      ])
                    }
                    aria-label={`${t("add")} ${t(`day.${weekday}`)}`}
                  >
                    {t("add")}
                  </Button>
                  {intervals.length > 0 && (
                    <Button
                      size="small"
                      onClick={() => setCopyFrom(weekday)}
                      aria-label={`${t("copy")} ${t(`day.${weekday}`)}`}
                    >
                      {t("copy")}
                    </Button>
                  )}
                </Stack>
              )}
            </Stack>
          </Paper>
        );
      })}
      {editable && (
        <Button
          variant="contained"
          onClick={submit}
          disabled={isLoading}
          sx={{ alignSelf: "flex-start" }}
        >
          {isLoading ? common("saving") : common("save")}
        </Button>
      )}
      <Dialog open={copyFrom !== null} onClose={() => setCopyFrom(null)}>
        <DialogTitle>
          {copyFrom !== null && t("copyTitle", { day: t(`day.${copyFrom}`) })}
        </DialogTitle>
        <DialogContent>
          <Stack>
            {WEEKDAYS.filter((weekday) => weekday !== copyFrom).map(
              (weekday) => (
                <FormControlLabel
                  key={weekday}
                  label={t(`day.${weekday}`)}
                  control={
                    <Checkbox
                      checked={copyTo.includes(weekday)}
                      onChange={(event) =>
                        setCopyTo((current) =>
                          event.target.checked
                            ? [...current, weekday]
                            : current.filter((day) => day !== weekday),
                        )
                      }
                    />
                  }
                />
              ),
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCopyFrom(null)}>{t("cancel")}</Button>
          <Button
            variant="contained"
            disabled={copyTo.length === 0}
            onClick={copy}
          >
            {t("copyConfirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
