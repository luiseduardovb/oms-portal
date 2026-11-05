"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { useErrorMessage } from "@/lib/useErrorMessage";
import {
  useArchiveOutletMutation,
  useUpdateOutletMutation,
  type OutletChanges,
  type OutletDetail,
} from "./outletsApi";

const PHONE = /^\+[1-9]\d{7,14}$/;
const MONEY = /^\d{1,10}(\.\d{1,2})?$/;

export function validTimezone(name: string): boolean {
  try {
    new Intl.DateTimeFormat("es", { timeZone: name });
    return true;
  } catch {
    return false;
  }
}

/** Maps and phones give 7 or more decimals; the API keeps 6 (about 10 cm). */
export function roundCoordinate(value: number): number {
  return Number(value.toFixed(6));
}

function whole(text: string, min: number, max: number): number | null {
  if (!/^\d{1,4}$/.test(text.trim())) return null;
  const value = Number(text);
  return value >= min && value <= max ? value : null;
}

interface Props {
  outlet: OutletDetail;
  canEdit: boolean;
  /** May archive: the API refuses members limited to other outlets. */
  canArchive: boolean;
}

export function DataTab({ outlet, canEdit, canArchive }: Props) {
  const t = useTranslations("outlets.data");
  const common = useTranslations("setup");
  const errorMessage = useErrorMessage();
  const [save, { isLoading, error, isSuccess, reset }] =
    useUpdateOutletMutation();
  const [archive, archiving] = useArchiveOutletMutation();
  const archived = outlet.archivedAt !== null;
  const editable = canEdit && !archived;

  const [name, setName] = useState(outlet.name);
  const [address, setAddress] = useState(outlet.addressText ?? "");
  const [notes, setNotes] = useState(outlet.referenceNotes ?? "");
  const [phone, setPhone] = useState(outlet.phone ?? "");
  const [latitude, setLatitude] = useState(outlet.latitude ?? "");
  const [longitude, setLongitude] = useState(outlet.longitude ?? "");
  const [timezone, setTimezone] = useState(outlet.timezone);
  const [editZone, setEditZone] = useState(false);
  const [isPublic, setIsPublic] = useState(outlet.isPublic);
  const [pickup, setPickup] = useState(outlet.pickupEnabled);
  const [delivery, setDelivery] = useState(outlet.deliveryEnabled);
  const [busy, setBusy] = useState(outlet.isBusy);
  const [prep, setPrep] = useState(String(outlet.prepTimeMinutes));
  const [alert, setAlert] = useState(String(outlet.acceptAlertMinutes));
  const [expire, setExpire] = useState(String(outlet.expireUnacceptedMinutes));
  const [auto, setAuto] = useState(outlet.autoAccept);
  const [fee, setFee] = useState(outlet.deliveryFee);
  const [minOrder, setMinOrder] = useState(outlet.deliveryMinOrder);
  const [eta, setEta] = useState(String(outlet.deliveryEtaMinutes));
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);

  const submit = async () => {
    reset();
    const found: Record<string, string> = {};
    if (name.trim() === "") found.name = t("nameRequired");
    if (phone.trim() !== "" && !PHONE.test(phone.trim()))
      found.phone = t("phoneInvalid");
    const lat = latitude.trim();
    const lon = longitude.trim();
    if ((lat === "") !== (lon === "")) found.pin = t("pinBoth");
    else if (lat !== "") {
      const latNumber = Number(lat);
      const lonNumber = Number(lon);
      if (
        !Number.isFinite(latNumber) ||
        !Number.isFinite(lonNumber) ||
        Math.abs(latNumber) > 90 ||
        Math.abs(lonNumber) > 180
      )
        found.pin = t("pinInvalid");
    }
    if (!validTimezone(timezone.trim())) found.timezone = t("timezoneInvalid");
    const prepValue = whole(prep, 0, 600);
    if (prepValue === null) found.prep = t("numberInvalid", { max: 600 });
    const alertValue = whole(alert, 1, 119);
    if (alertValue === null) found.alert = t("numberInvalid", { max: 119 });
    const expireValue = whole(expire, 2, 120);
    if (expireValue === null) found.expire = t("numberInvalid", { max: 120 });
    if (
      alertValue !== null &&
      expireValue !== null &&
      alertValue >= expireValue
    )
      found.expire = t("alertBeforeExpire");
    const etaValue = whole(eta, 0, 600);
    if (etaValue === null) found.eta = t("numberInvalid", { max: 600 });
    if (!MONEY.test(fee.trim())) found.fee = t("moneyInvalid");
    if (!MONEY.test(minOrder.trim())) found.minOrder = t("moneyInvalid");
    setProblems(found);
    if (Object.keys(found).length > 0) return;

    const next = {
      name: name.trim(),
      addressText: address.trim() || null,
      referenceNotes: notes.trim() || null,
      phone: phone.trim() || null,
      latitude: lat === "" ? null : roundCoordinate(Number(lat)),
      longitude: lon === "" ? null : roundCoordinate(Number(lon)),
      timezone: timezone.trim(),
      isPublic,
      pickupEnabled: pickup,
      deliveryEnabled: delivery,
      isBusy: busy,
      prepTimeMinutes: prepValue!,
      acceptAlertMinutes: alertValue!,
      expireUnacceptedMinutes: expireValue!,
      autoAccept: auto,
      deliveryFee: Number(fee),
      deliveryMinOrder: Number(minOrder),
      deliveryEtaMinutes: etaValue!,
    };
    const before: Record<string, unknown> = {
      ...outlet,
      latitude: outlet.latitude === null ? null : Number(outlet.latitude),
      longitude: outlet.longitude === null ? null : Number(outlet.longitude),
      deliveryFee: Number(outlet.deliveryFee),
      deliveryMinOrder: Number(outlet.deliveryMinOrder),
    };
    // Send only what changed.
    const changes = Object.fromEntries(
      Object.entries(next).filter(([key, value]) => before[key] !== value),
    ) as OutletChanges;
    if (Object.keys(changes).length === 0) return;
    await save({ id: outlet.id, changes });
  };

  const missing =
    (error as ApiError | undefined)?.code === "outlet.not_ready"
      ? (((error as ApiError).ctx.missing as string[] | undefined) ?? [])
      : [];

  const toggle = (
    label: string,
    checked: boolean,
    set: (value: boolean) => void,
  ) => (
    <FormControlLabel
      control={
        <Switch
          checked={checked}
          disabled={!editable}
          onChange={(event) => set(event.target.checked)}
        />
      }
      label={label}
    />
  );

  const field = (
    label: string,
    value: string,
    set: (value: string) => void,
    problem?: string,
    extra: { multiline?: boolean; placeholder?: string } = {},
  ) => (
    <TextField
      label={label}
      value={value}
      disabled={!editable}
      error={Boolean(problem)}
      helperText={problem}
      onChange={(event) => set(event.target.value)}
      {...extra}
    />
  );

  return (
    <Stack spacing={3}>
      {archived && <Alert severity="info">{t("archivedNote")}</Alert>}
      {error && (
        <Alert severity="error">
          {errorMessage(error as ApiError)}
          {missing.length > 0 && (
            <ul>
              {missing.map((item) => (
                <li key={item}>
                  {t.has(`missing.${item}`) ? t(`missing.${item}`) : item}
                </li>
              ))}
            </ul>
          )}
        </Alert>
      )}
      {archiving.error && (
        <Alert severity="error">
          {errorMessage(archiving.error as ApiError)}
        </Alert>
      )}
      {isSuccess && <Alert severity="success">{common("saved")}</Alert>}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6" component="h2">
            {t("locationSection")}
          </Typography>
          {field(t("name"), name, setName, problems.name)}
          {field(t("address"), address, setAddress)}
          {field(t("notes"), notes, setNotes, undefined, { multiline: true })}
          {field(t("phone"), phone, setPhone, problems.phone, {
            placeholder: "+50499998888",
          })}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            {field(t("latitude"), latitude, setLatitude, problems.pin)}
            {field(t("longitude"), longitude, setLongitude)}
          </Stack>
          {editZone ? (
            field(t("timezone"), timezone, setTimezone, problems.timezone)
          ) : (
            <Typography>
              {t("timezone")}: {timezone}{" "}
              {editable && (
                <Link component="button" onClick={() => setEditZone(true)}>
                  {t("changeZone")}
                </Link>
              )}
            </Typography>
          )}
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6" component="h2">
            {t("ordersSection")}
          </Typography>
          {toggle(t("isPublic"), isPublic, setIsPublic)}
          {toggle(t("pickup"), pickup, setPickup)}
          {toggle(t("delivery"), delivery, setDelivery)}
          {toggle(t("busy"), busy, setBusy)}
          {toggle(t("autoAccept"), auto, setAuto)}
          {field(t("prep"), prep, setPrep, problems.prep)}
          {field(t("alert"), alert, setAlert, problems.alert)}
          {field(t("expire"), expire, setExpire, problems.expire)}
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6" component="h2">
            {t("deliverySection")}
          </Typography>
          {field(t("fee"), fee, setFee, problems.fee)}
          {field(t("minOrder"), minOrder, setMinOrder, problems.minOrder)}
          {field(t("eta"), eta, setEta, problems.eta)}
        </Stack>
      </Paper>
      {editable && (
        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={submit} disabled={isLoading}>
            {isLoading ? common("saving") : common("save")}
          </Button>
          {canArchive && (
            <Button color="error" onClick={() => setConfirming(true)}>
              {t("archive")}
            </Button>
          )}
        </Stack>
      )}
      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle>{t("archiveTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t("archiveText")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>{t("cancel")}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              setConfirming(false);
              await archive(outlet.id);
            }}
          >
            {t("confirmArchive")}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
