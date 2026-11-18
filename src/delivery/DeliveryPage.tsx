"use client";

import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import type { ApiError } from "@/api/apiError";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { formatMoney } from "@/catalog/money";
import { PageFrame } from "@/components/PageFrame";
import { useErrorMessage } from "@/lib/useErrorMessage";
import {
  useOutletQuery,
  useOutletsQuery,
  useUpdateOutletMutation,
  type OutletDetail,
} from "@/outlets/outletsApi";
import { useStoreSetupQuery } from "@/setup/setupApi";
import {
  useDeleteZoneMutation,
  useLazyCheckAddressQuery,
  useReorderZonesMutation,
  useReplaceZoneMutation,
  useZonesQuery,
  type Zone,
} from "./deliveryApi";
import { DeliveryMap, type LatLng } from "./DeliveryMap";
import { PlaceSearch } from "./PlaceSearch";
import { areaKm2, type Point } from "./zoneShape";

export function DeliveryPage() {
  const t = useTranslations("delivery");
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const params = useSearchParams();
  const { data: me } = useMe();
  const outlets = useOutletsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const setup = useStoreSetupQuery();

  const choices = useMemo(
    () => (outlets.data ?? []).filter((o) => o.archivedAt == null),
    [outlets.data],
  );
  const wanted = Number(params.get("outlet"));
  const outletId =
    choices.find((o) => o.id === wanted)?.id ?? choices[0]?.id ?? null;

  if (!me) return null;
  if (!can(me.levels, "setup", "view")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  const canEdit = can(me.levels, "setup", "full");
  const currency = setup.data?.country.currencyCode ?? "HNL";

  return (
    <PageFrame section={t("section")} title={t("title")} maxWidth={1100}>
      <Stack spacing={3}>
        {!canEdit && <Alert severity="info">{t("readOnly")}</Alert>}
        {outlets.error && (
          <Alert severity="error">
            {errorMessage(outlets.error as ApiError)}
          </Alert>
        )}
        {outlets.isLoading && <CircularProgress aria-label={t("loading")} />}
        {outlets.data && choices.length === 0 && (
          <Alert severity="info">
            {t("noOutlets")} <Link href="/outlets">{t("goOutlets")}</Link>
          </Alert>
        )}
        {choices.length > 1 && (
          <TextField
            select
            size="small"
            label={t("outlet")}
            value={outletId ?? ""}
            onChange={(event) =>
              router.push(`/setup/delivery?outlet=${event.target.value}`)
            }
            sx={{ maxWidth: 320 }}
          >
            {choices.map((o) => (
              <MenuItem key={o.id} value={o.id}>
                {o.name}
              </MenuItem>
            ))}
          </TextField>
        )}
        {outletId != null && (
          <OutletDelivery
            key={outletId}
            outletId={outletId}
            canEdit={canEdit}
            currency={currency}
          />
        )}
      </Stack>
    </PageFrame>
  );
}

function OutletDelivery({
  outletId,
  canEdit,
  currency,
}: {
  outletId: number;
  canEdit: boolean;
  currency: string;
}) {
  const t = useTranslations("delivery");
  const errorMessage = useErrorMessage();
  const outlet = useOutletQuery(outletId, { refetchOnMountOrArgChange: true });
  const [update, updating] = useUpdateOutletMutation();
  const [failure, setFailure] = useState<string | null>(null);

  if (outlet.isLoading) return <CircularProgress aria-label={t("loading")} />;
  if (outlet.error || !outlet.data) {
    return (
      <Alert severity="error">{errorMessage(outlet.error as ApiError)}</Alert>
    );
  }
  const data = outlet.data;
  const setMode = async (mode: OutletDetail["deliveryMode"]) => {
    setFailure(null);
    const result = await update({
      id: data.id,
      changes: { deliveryMode: mode },
    });
    if ("error" in result && result.error) {
      setFailure(errorMessage(result.error as ApiError));
    }
  };

  return (
    <Stack spacing={3}>
      {failure && <Alert severity="error">{failure}</Alert>}
      {!data.deliveryEnabled && (
        <Alert severity="warning">
          {t("deliveryOff")}{" "}
          <Link href={`/outlets/${data.id}`}>{t("editOutlet")}</Link>
        </Alert>
      )}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
        >
          <div>
            <Typography variant="subtitle1" component="h2">
              {t("mode.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t(`mode.help.${data.deliveryMode}`)}
            </Typography>
          </div>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={data.deliveryMode}
            disabled={!canEdit || updating.isLoading}
            onChange={(_event, value: OutletDetail["deliveryMode"] | null) => {
              if (value) void setMode(value);
            }}
            aria-label={t("mode.title")}
          >
            <ToggleButton value="flat">{t("mode.flat")}</ToggleButton>
            <ToggleButton value="zones">{t("mode.zones")}</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>
      {data.deliveryMode === "flat" ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={1}>
            <Typography>
              {t("flat.fee")}: {formatMoney(data.deliveryFee, currency)}
            </Typography>
            <Typography>
              {t("flat.min")}: {formatMoney(data.deliveryMinOrder, currency)}
            </Typography>
            <Typography>
              {t("flat.eta", { minutes: data.deliveryEtaMinutes })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("flat.help")}{" "}
              {canEdit && (
                <Link href={`/outlets/${data.id}`}>{t("editOutlet")}</Link>
              )}
            </Typography>
          </Stack>
        </Paper>
      ) : (
        <Zones outlet={data} canEdit={canEdit} currency={currency} />
      )}
    </Stack>
  );
}

function Zones({
  outlet,
  canEdit,
  currency,
}: {
  outlet: OutletDetail;
  canEdit: boolean;
  currency: string;
}) {
  const t = useTranslations("delivery");
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const zones = useZonesQuery(outlet.id, { refetchOnMountOrArgChange: true });
  const [replace] = useReplaceZoneMutation();
  const [remove] = useDeleteZoneMutation();
  const [reorder] = useReorderZonesMutation();
  const [check, checked] = useLazyCheckAddressQuery();
  const [menu, setMenu] = useState<{ el: HTMLElement; zone: Zone } | null>(
    null,
  );
  const [removing, setRemoving] = useState<Zone | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [probe, setProbe] = useState<LatLng | null>(null);
  const [view, setView] = useState<LatLng | null>(null);

  const list = zones.data ?? [];
  const pin: LatLng | null =
    outlet.latitude != null && outlet.longitude != null
      ? { lat: Number(outlet.latitude), lng: Number(outlet.longitude) }
      : null;
  const fail = (error: unknown) => setFailure(errorMessage(error as ApiError));

  const test = (at: LatLng) => {
    setProbe(at);
    void check({ outletId: outlet.id, latitude: at.lat, longitude: at.lng });
  };
  const toggle = async (zone: Zone) => {
    setFailure(null);
    const result = await replace({
      outletId: outlet.id,
      id: zone.id,
      body: {
        name: zone.name,
        polygon: zone.polygon,
        fee: zone.fee,
        minOrder: zone.minOrder,
        etaMinutes: zone.etaMinutes,
        freeOver: zone.freeOver,
        isActive: !zone.isActive,
      },
    });
    if ("error" in result && result.error) fail(result.error);
  };
  const move = async (index: number, by: -1 | 1) => {
    const ids = list.map((z) => z.id);
    const other = index + by;
    if (other < 0 || other >= ids.length) return;
    [ids[index], ids[other]] = [ids[other]!, ids[index]!];
    setFailure(null);
    const result = await reorder({ outletId: outlet.id, ids });
    if ("error" in result && result.error) fail(result.error);
  };

  const mapZones = list.map((z) => ({
    id: z.id,
    name: z.name,
    ring: z.polygon as Point[],
    active: z.isActive,
  }));

  return (
    <Stack spacing={3}>
      {failure && <Alert severity="error">{failure}</Alert>}
      {zones.error && (
        <Alert severity="error">{errorMessage(zones.error as ApiError)}</Alert>
      )}
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <Typography variant="h6" component="h2">
          {t("zones.title")}
        </Typography>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() =>
              router.push(`/setup/delivery/zones/new?outlet=${outlet.id}`)
            }
          >
            {t("zones.add")}
          </Button>
        )}
      </Stack>
      {zones.isLoading && <CircularProgress aria-label={t("loading")} />}
      {zones.data && list.length === 0 && (
        <Alert severity="warning">{t("zones.empty")}</Alert>
      )}
      {list.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("zones.name")}</TableCell>
                <TableCell>{t("zones.fee")}</TableCell>
                <TableCell>{t("zones.min")}</TableCell>
                <TableCell>{t("zones.eta")}</TableCell>
                <TableCell>{t("zones.status")}</TableCell>
                {canEdit && (
                  <TableCell align="right">{t("zones.actions")}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((zone, index) => (
                <TableRow key={zone.id} hover>
                  <TableCell>
                    <Typography>{zone.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t("zones.area", {
                        km2: areaKm2(zone.polygon as Point[]).toFixed(1),
                      })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {formatMoney(zone.fee, currency)}
                    {zone.freeOver != null && (
                      <Typography
                        variant="caption"
                        component="div"
                        color="text.secondary"
                      >
                        {t("zones.freeOver", {
                          amount: formatMoney(zone.freeOver, currency),
                        })}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{formatMoney(zone.minOrder, currency)}</TableCell>
                  <TableCell>
                    {t("zones.minutes", { minutes: zone.etaMinutes })}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={zone.isActive ? "success" : "default"}
                      label={zone.isActive ? t("zones.on") : t("zones.off")}
                    />
                  </TableCell>
                  {canEdit && (
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <IconButton
                        size="small"
                        disabled={index === 0}
                        aria-label={t("zones.up", { name: zone.name })}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        disabled={index === list.length - 1}
                        aria-label={t("zones.down", { name: zone.name })}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label={t("zones.more", { name: zone.name })}
                        onClick={(event) =>
                          setMenu({ el: event.currentTarget, zone })
                        }
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {list.length > 1 && (
        <Typography variant="body2" color="text.secondary">
          {t("zones.orderHelp")}
        </Typography>
      )}

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          <Typography variant="h6" component="h2">
            {t("test.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("test.help")}
          </Typography>
          <PlaceSearch
            onPick={(place) => {
              setView({ lat: place.lat, lng: place.lng });
              test({ lat: place.lat, lng: place.lng });
            }}
          />
          {checked.data && probe && (
            <Alert severity={checked.data.covered ? "success" : "warning"}>
              {checked.data.covered
                ? t("test.covered", {
                    zone: checked.data.zoneName ?? "",
                    fee: formatMoney(checked.data.fee, currency),
                    min: formatMoney(checked.data.minOrder, currency),
                    minutes: checked.data.etaMinutes,
                  })
                : t("test.notCovered")}
            </Alert>
          )}
          {checked.error && (
            <Alert severity="error">
              {errorMessage(checked.error as ApiError)}
            </Alert>
          )}
          <DeliveryMap
            center={view ?? pin}
            outlet={pin}
            zones={mapZones}
            probe={probe}
            onProbe={test}
            height={460}
          />
          {!pin && (
            <Alert severity="info">
              {t("test.noPin")}{" "}
              <Link href={`/outlets/${outlet.id}`}>{t("editOutlet")}</Link>
            </Alert>
          )}
        </Stack>
      </Paper>

      <Menu
        anchorEl={menu?.el}
        open={menu != null}
        onClose={() => setMenu(null)}
      >
        <MenuItem
          onClick={() => {
            const zone = menu?.zone;
            setMenu(null);
            if (zone) {
              router.push(
                `/setup/delivery/zones/${zone.id}?outlet=${outlet.id}`,
              );
            }
          }}
        >
          {t("zones.edit")}
        </MenuItem>
        <MenuItem
          onClick={() => {
            const zone = menu?.zone;
            setMenu(null);
            if (zone) void toggle(zone);
          }}
        >
          {menu?.zone.isActive ? t("zones.deactivate") : t("zones.activate")}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setRemoving(menu?.zone ?? null);
            setMenu(null);
          }}
        >
          {t("zones.remove")}
        </MenuItem>
      </Menu>
      <Dialog open={removing != null} onClose={() => setRemoving(null)}>
        <DialogTitle>{t("zones.removeTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("zones.removeBody", { name: removing?.name ?? "" })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoving(null)}>{t("zones.cancel")}</Button>
          <Button
            color="error"
            onClick={async () => {
              const zone = removing;
              setRemoving(null);
              if (!zone) return;
              const result = await remove({ outletId: outlet.id, id: zone.id });
              if ("error" in result && result.error) fail(result.error);
            }}
          >
            {t("zones.confirmRemove")}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
