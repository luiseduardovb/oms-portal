"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useReducer, useState } from "react";
import type { ApiError } from "@/api/apiError";
import { MONEY_INPUT, currencySymbol } from "@/catalog/money";
import { useErrorMessage } from "@/lib/useErrorMessage";
import type { OutletDetail } from "@/outlets/outletsApi";
import {
  useCreateZoneMutation,
  useReplaceZoneMutation,
  type Zone,
  type ZoneBody,
} from "./deliveryApi";
import { DeliveryMap, type LatLng, type MapZone } from "./DeliveryMap";
import { PlaceSearch } from "./PlaceSearch";
import {
  MAX_RADIUS,
  MIN_RADIUS,
  NO_SHAPE,
  shapeBody,
  shapeProblem,
  shapeReducer,
  type Point,
} from "./zoneShape";

interface Props {
  outlet: OutletDetail;
  zone: Zone | null;
  /** The branch's other zones, drawn faintly for reference. */
  others: Zone[];
  currency: string;
}

export function ZoneForm(props: Props) {
  return <Form key={props.zone?.id ?? "new"} {...props} />;
}

function Form({ outlet, zone, others, currency }: Props) {
  const t = useTranslations("delivery.form");
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [create, creating] = useCreateZoneMutation();
  const [replace, replacing] = useReplaceZoneMutation();
  const [shape, dispatch] = useReducer(
    shapeReducer,
    zone
      ? shapeReducer(NO_SHAPE, { type: "load", ring: zone.polygon as Point[] })
      : shapeReducer(NO_SHAPE, { type: "polygon" }),
  );
  const [name, setName] = useState(zone?.name ?? "");
  const [fee, setFee] = useState(zone?.fee ?? "");
  const [minOrder, setMinOrder] = useState(zone?.minOrder ?? "0");
  const [eta, setEta] = useState(String(zone?.etaMinutes ?? 40));
  const [freeOn, setFreeOn] = useState(zone?.freeOver != null);
  const [freeOver, setFreeOver] = useState(zone?.freeOver ?? "");
  const [active, setActive] = useState(zone?.isActive ?? true);
  const [tried, setTried] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [center, setCenter] = useState<LatLng | null>(null);

  const pin: LatLng | null =
    outlet.latitude != null && outlet.longitude != null
      ? { lat: Number(outlet.latitude), lng: Number(outlet.longitude) }
      : null;
  const symbol = currencySymbol(currency);

  const problems: Record<string, string> = {};
  if (name.trim() === "") problems.name = t("required");
  if (!MONEY_INPUT.test(fee)) problems.fee = t("invalidMoney");
  if (!MONEY_INPUT.test(minOrder)) problems.minOrder = t("invalidMoney");
  if (!/^\d{1,3}$/.test(eta) || Number(eta) > 600)
    problems.eta = t("invalidEta");
  if (freeOn && (!MONEY_INPUT.test(freeOver) || Number(freeOver) <= 0)) {
    problems.freeOver = t("invalidMoney");
  }
  const shapeIssue = shapeProblem(shape);
  const bad = Object.keys(problems).length > 0 || shapeIssue !== null;
  const shown = (key: string) => (tried ? problems[key] : undefined);

  const submit = async () => {
    setTried(true);
    setFailure(null);
    if (bad) return;
    const body: ZoneBody = {
      name: name.trim(),
      ...shapeBody(shape),
      fee,
      minOrder,
      etaMinutes: Number(eta),
      freeOver: freeOn ? freeOver : null,
      isActive: active,
    };
    const result = zone
      ? await replace({ outletId: outlet.id, id: zone.id, body })
      : await create({ outletId: outlet.id, body });
    if ("error" in result && result.error) {
      setFailure(errorMessage(result.error as ApiError));
      return;
    }
    router.push(`/setup/delivery?outlet=${outlet.id}`);
  };

  const faint: MapZone[] = useMemo(
    () =>
      others
        .filter((z) => z.id !== zone?.id)
        .map((z) => ({
          id: z.id,
          name: z.name,
          ring: z.polygon as Point[],
          active: z.isActive,
        })),
    [others, zone?.id],
  );

  const hint =
    shape.kind === "none"
      ? t("hintStart")
      : shape.kind === "circle"
        ? shape.center
          ? t("hintCircleDone")
          : t("hintCircle")
        : shape.closed
          ? t("hintClosed")
          : shape.points.length < 3
            ? t("hintPolygon")
            : t("hintClose");

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 5 }}>
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={3}>
            {failure && <Alert severity="error">{failure}</Alert>}
            <TextField
              label={t("name")}
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={Boolean(shown("name"))}
              helperText={shown("name") ?? t("nameHelp")}
              slotProps={{ htmlInput: { maxLength: 80 } }}
              fullWidth
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label={t("fee")}
                value={fee}
                onChange={(event) => setFee(event.target.value)}
                error={Boolean(shown("fee"))}
                helperText={shown("fee")}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">{symbol}</InputAdornment>
                    ),
                  },
                  htmlInput: { inputMode: "decimal" },
                }}
                fullWidth
              />
              <TextField
                label={t("minOrder")}
                value={minOrder}
                onChange={(event) => setMinOrder(event.target.value)}
                error={Boolean(shown("minOrder"))}
                helperText={shown("minOrder")}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">{symbol}</InputAdornment>
                    ),
                  },
                  htmlInput: { inputMode: "decimal" },
                }}
                fullWidth
              />
            </Stack>
            <TextField
              label={t("eta")}
              value={eta}
              onChange={(event) => setEta(event.target.value)}
              error={Boolean(shown("eta"))}
              helperText={shown("eta") ?? t("etaHelp")}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      {t("minutes")}
                    </InputAdornment>
                  ),
                },
                htmlInput: { inputMode: "numeric" },
              }}
            />
            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={freeOn}
                    onChange={(event) => setFreeOn(event.target.checked)}
                  />
                }
                label={t("freeOver")}
              />
              {freeOn && (
                <TextField
                  label={t("freeOverAmount")}
                  value={freeOver}
                  onChange={(event) => setFreeOver(event.target.value)}
                  error={Boolean(shown("freeOver"))}
                  helperText={shown("freeOver") ?? t("freeOverHelp")}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          {symbol}
                        </InputAdornment>
                      ),
                    },
                    htmlInput: { inputMode: "decimal" },
                  }}
                />
              )}
            </Stack>
            <FormControlLabel
              control={
                <Switch
                  checked={active}
                  onChange={(event) => setActive(event.target.checked)}
                />
              }
              label={t("active")}
            />
            {tried && shapeIssue && (
              <Alert severity="warning">{t(`shape.${shapeIssue}`)}</Alert>
            )}
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={submit}
                disabled={creating.isLoading || replacing.isLoading}
              >
                {t("save")}
              </Button>
              <Button
                variant="text"
                onClick={() =>
                  router.push(`/setup/delivery?outlet=${outlet.id}`)
                }
              >
                {t("cancel")}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 7 }}>
        <Stack spacing={2}>
          <PlaceSearch
            onPick={(place) => setCenter({ lat: place.lat, lng: place.lng })}
          />
          <Stack
            direction="row"
            spacing={1}
            sx={{ flexWrap: "wrap", rowGap: 1 }}
          >
            <ToggleButtonGroup
              size="small"
              exclusive
              value={shape.kind === "circle" ? "circle" : "polygon"}
              onChange={(_event, value: "polygon" | "circle" | null) => {
                if (value === "circle") dispatch({ type: "circle" });
                if (value === "polygon") dispatch({ type: "polygon" });
              }}
              aria-label={t("tool")}
            >
              <ToggleButton value="polygon">{t("polygon")}</ToggleButton>
              <ToggleButton value="circle">{t("circle")}</ToggleButton>
            </ToggleButtonGroup>
            {shape.kind === "polygon" && !shape.closed && (
              <>
                <Button
                  size="small"
                  disabled={shape.points.length < 3}
                  onClick={() => dispatch({ type: "close" })}
                >
                  {t("close")}
                </Button>
                <Button
                  size="small"
                  disabled={shape.points.length === 0}
                  onClick={() => dispatch({ type: "undo" })}
                >
                  {t("undo")}
                </Button>
              </>
            )}
            {shape.kind !== "none" && (
              <Button
                size="small"
                color="inherit"
                onClick={() => dispatch({ type: "clear" })}
              >
                {t("clear")}
              </Button>
            )}
          </Stack>
          {shape.kind === "circle" && (
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Typography sx={{ minWidth: 110 }}>{t("radius")}</Typography>
              <Slider
                value={shape.radius}
                min={MIN_RADIUS}
                max={10_000}
                step={100}
                onChange={(_event, value) =>
                  dispatch({ type: "radius", radius: value })
                }
                aria-label={t("radius")}
              />
              <TextField
                size="small"
                value={shape.radius}
                onChange={(event) => {
                  const n = Number(event.target.value);
                  if (
                    Number.isFinite(n) &&
                    n >= MIN_RADIUS &&
                    n <= MAX_RADIUS
                  ) {
                    dispatch({ type: "radius", radius: n });
                  }
                }}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">m</InputAdornment>
                    ),
                  },
                  htmlInput: {
                    inputMode: "numeric",
                    "aria-label": t("radius"),
                  },
                }}
                sx={{ width: 120 }}
              />
            </Stack>
          )}
          <Typography variant="body2" color="text.secondary">
            {hint}
          </Typography>
          <DeliveryMap
            center={center ?? pin}
            outlet={pin}
            zones={faint}
            shape={shape}
            dispatch={dispatch}
            height={480}
          />
          {!pin && <Alert severity="info">{t("noPin")}</Alert>}
        </Stack>
      </Grid>
    </Grid>
  );
}
