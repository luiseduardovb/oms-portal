"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { useUpdateSettingsMutation, type StoreSetup } from "./setupApi";
import { formatTipPresets, parseTipPresets } from "./tips";

const INTERVALS = [10, 15, 20, 30, 60];
const COLOR = /^#[0-9A-Fa-f]{6}$/;

interface Props {
  setup: StoreSetup;
  canEdit: boolean;
}

export function OrdersTab({ setup, canEdit }: Props) {
  const t = useTranslations("setup.orders");
  const common = useTranslations("setup");
  const errorMessage = useErrorMessage();
  const [save, { isLoading, error, isSuccess, reset }] =
    useUpdateSettingsMutation();
  const s = setup.settings;
  const [pageTitle, setPageTitle] = useState(s.pageTitle ?? "");
  const [slogan, setSlogan] = useState(s.slogan ?? "");
  const [color, setColor] = useState(s.primaryColor ?? "");
  const [hideName, setHideName] = useState(s.hideStoreName);
  const [asap, setAsap] = useState(s.asapEnabled);
  const [scheduled, setScheduled] = useState(s.scheduledEnabled);
  const [interval, setInterval] = useState(s.slotIntervalMinutes);
  const [days, setDays] = useState(String(s.maxScheduleDays));
  const [tips, setTips] = useState(s.tipsEnabled);
  const [presets, setPresets] = useState(formatTipPresets(s.tipPresetsPercent));
  const [problems, setProblems] = useState<Record<string, string>>({});

  const submit = async () => {
    reset();
    const found: Record<string, string> = {};
    const trimmedColor = color.trim();
    if (trimmedColor !== "" && !COLOR.test(trimmedColor))
      found.color = t("colorInvalid");
    const dayCount = Number(days);
    if (!Number.isInteger(dayCount) || dayCount < 1 || dayCount > 30)
      found.days = t("daysInvalid");
    if (!asap && !scheduled) found.timing = t("noTiming");
    const parsed = parseTipPresets(presets);
    if (parsed === null) found.presets = t("tipPresetsInvalid");
    else if (tips && parsed.length === 0) found.presets = t("tipsNeedPresets");
    setProblems(found);
    if (Object.keys(found).length > 0 || parsed === null) return;
    await save({
      pageTitle: pageTitle.trim() || null,
      slogan: slogan.trim() || null,
      primaryColor: trimmedColor || null,
      hideStoreName: hideName,
      asapEnabled: asap,
      scheduledEnabled: scheduled,
      slotIntervalMinutes: interval,
      maxScheduleDays: dayCount,
      tipsEnabled: tips,
      tipPresetsPercent: parsed,
    });
  };

  const toggle = (
    label: string,
    checked: boolean,
    set: (value: boolean) => void,
  ) => (
    <FormControlLabel
      control={
        <Switch
          checked={checked}
          disabled={!canEdit}
          onChange={(event) => set(event.target.checked)}
        />
      }
      label={label}
    />
  );

  return (
    <Stack spacing={3}>
      {error && (
        <Alert severity="error">{errorMessage(error as ApiError)}</Alert>
      )}
      {isSuccess && <Alert severity="success">{common("saved")}</Alert>}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6" component="h2">
            {t("pageSection")}
          </Typography>
          <TextField
            label={t("pageTitle")}
            value={pageTitle}
            disabled={!canEdit}
            onChange={(event) => setPageTitle(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
          <TextField
            label={t("slogan")}
            value={slogan}
            disabled={!canEdit}
            onChange={(event) => setSlogan(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />
          <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start" }}>
            <TextField
              label={t("primaryColor")}
              value={color}
              placeholder="#1A73E8"
              disabled={!canEdit}
              error={Boolean(problems.color)}
              helperText={problems.color}
              onChange={(event) => setColor(event.target.value)}
            />
            <Box
              component="input"
              type="color"
              aria-label={t("pickColor")}
              value={COLOR.test(color.trim()) ? color.trim() : "#000000"}
              disabled={!canEdit}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setColor(event.target.value.toUpperCase())
              }
              sx={{ height: 56, width: 56, p: 0.5, cursor: "pointer" }}
            />
          </Stack>
          {toggle(t("hideStoreName"), hideName, setHideName)}
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6" component="h2">
            {t("timingSection")}
          </Typography>
          {problems.timing && <Alert severity="error">{problems.timing}</Alert>}
          {toggle(t("asapEnabled"), asap, setAsap)}
          {toggle(t("scheduledEnabled"), scheduled, setScheduled)}
          <TextField
            select
            label={t("slotInterval")}
            value={interval}
            disabled={!canEdit}
            onChange={(event) => setInterval(Number(event.target.value))}
          >
            {INTERVALS.map((minutes) => (
              <MenuItem key={minutes} value={minutes}>
                {minutes}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t("maxScheduleDays")}
            type="number"
            value={days}
            disabled={!canEdit}
            error={Boolean(problems.days)}
            helperText={problems.days}
            onChange={(event) => setDays(event.target.value)}
          />
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6" component="h2">
            {t("tipsSection")}
          </Typography>
          {toggle(t("tipsEnabled"), tips, setTips)}
          <TextField
            label={t("tipPresets")}
            value={presets}
            disabled={!canEdit}
            error={Boolean(problems.presets)}
            helperText={problems.presets ?? t("tipPresetsHelp")}
            onChange={(event) => setPresets(event.target.value)}
          />
        </Stack>
      </Paper>
      {canEdit ? (
        <Button
          variant="contained"
          onClick={submit}
          disabled={isLoading}
          sx={{ alignSelf: "flex-start" }}
        >
          {isLoading ? common("saving") : common("save")}
        </Button>
      ) : null}
    </Stack>
  );
}
