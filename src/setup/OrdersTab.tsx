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
const PHONE = /^\+[0-9]{8,15}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const LINK = /^https:\/\/\S+$/;

// "+504 2222-1111" is fine to type; the server keeps digits only.
const cleanPhone = (value: string) => value.trim().replace(/[\s\-().]/g, "");

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
  const [phone, setPhone] = useState(s.contactPhone ?? "");
  const [whatsapp, setWhatsapp] = useState(s.contactWhatsapp ?? "");
  const [email, setEmail] = useState(s.contactEmail ?? "");
  const [instagram, setInstagram] = useState(s.instagramUrl ?? "");
  const [facebook, setFacebook] = useState(s.facebookUrl ?? "");
  const [website, setWebsite] = useState(s.websiteUrl ?? "");
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
    const phoneValue = cleanPhone(phone);
    const whatsappValue = cleanPhone(whatsapp);
    if (phoneValue !== "" && !PHONE.test(phoneValue))
      found.phone = t("phoneInvalid");
    if (whatsappValue !== "" && !PHONE.test(whatsappValue))
      found.whatsapp = t("phoneInvalid");
    if (email.trim() !== "" && !EMAIL.test(email.trim()))
      found.email = t("emailInvalid");
    for (const [key, value] of [
      ["instagram", instagram],
      ["facebook", facebook],
      ["website", website],
    ] as const) {
      if (value.trim() !== "" && !LINK.test(value.trim()))
        found[key] = t("linkInvalid");
    }
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
      contactPhone: phoneValue || null,
      contactWhatsapp: whatsappValue || null,
      contactEmail: email.trim() || null,
      instagramUrl: instagram.trim() || null,
      facebookUrl: facebook.trim() || null,
      websiteUrl: website.trim() || null,
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
            {t("contactSection")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("contactHelp")}
          </Typography>
          <TextField
            label={t("contactPhone")}
            value={phone}
            placeholder="+504 2222-1111"
            disabled={!canEdit}
            error={Boolean(problems.phone)}
            helperText={problems.phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <TextField
            label={t("contactWhatsapp")}
            value={whatsapp}
            placeholder="+504 9999-8888"
            disabled={!canEdit}
            error={Boolean(problems.whatsapp)}
            helperText={problems.whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
          />
          <TextField
            label={t("contactEmail")}
            value={email}
            placeholder="hola@minegocio.com"
            disabled={!canEdit}
            error={Boolean(problems.email)}
            helperText={problems.email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <TextField
            label={t("instagramUrl")}
            value={instagram}
            placeholder="https://instagram.com/minegocio"
            disabled={!canEdit}
            error={Boolean(problems.instagram)}
            helperText={problems.instagram}
            onChange={(event) => setInstagram(event.target.value)}
          />
          <TextField
            label={t("facebookUrl")}
            value={facebook}
            placeholder="https://facebook.com/minegocio"
            disabled={!canEdit}
            error={Boolean(problems.facebook)}
            helperText={problems.facebook}
            onChange={(event) => setFacebook(event.target.value)}
          />
          <TextField
            label={t("websiteUrl")}
            value={website}
            placeholder="https://minegocio.com"
            disabled={!canEdit}
            error={Boolean(problems.website)}
            helperText={problems.website}
            onChange={(event) => setWebsite(event.target.value)}
          />
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
