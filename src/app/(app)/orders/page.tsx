"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TablePagination from "@mui/material/TablePagination";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiError } from "@/api/apiError";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { OrderRow } from "@/orders/OrderRow";
import {
  ordersApi,
  useOrderCountsQuery,
  useOrdersQuery,
} from "@/orders/ordersApi";
import {
  playAlert,
  readSoundPreference,
  saveSoundPreference,
  unlockSound,
} from "@/orders/sound";
import { MAIN_TABS, todayISO, type TabKey } from "@/orders/status";
import { useOrderEvents } from "@/orders/useOrderEvents";
import { useOutletsQuery } from "@/outlets/outletsApi";
import { useAppDispatch } from "@/store/hooks";

const PAGE_SIZE = 25;
const ALERT_EVENTS = new Set(["order.placed", "order.unaccepted"]);

export default function OrdersPage() {
  const t = useTranslations("ordersPage");
  const errorMessage = useErrorMessage();
  const dispatch = useAppDispatch();
  const { data: me } = useMe();
  const outlets = useOutletsQuery();
  const [tab, setTab] = useState<TabKey>("pending");
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const [outletId, setOutletId] = useState<number | "">("");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);
  const [sound, setSound] = useState(readSoundPreference);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const soundRef = useRef(false);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  const allowed = !!me && can(me.levels, "orders", "view");
  const filters = {
    outletId: outletId === "" ? undefined : outletId,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    // Open orders show whatever their date; the dates only limit the
    // completed and cancelled ones.
    openAnyDate: !!(dateFrom || dateTo),
    q: search || undefined,
  };
  const list = useOrdersQuery(
    {
      ...filters,
      status: tab === "all" ? undefined : [tab],
      page,
      itemsPerPage: PAGE_SIZE,
    },
    { skip: !allowed, refetchOnMountOrArgChange: true },
  );
  const counts = useOrderCountsQuery(filters, {
    skip: !allowed,
    refetchOnMountOrArgChange: true,
  });

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const refresh = useCallback(() => {
    // Several events can arrive together: reload once.
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      dispatch(
        ordersApi.util.invalidateTags(["Orders", "OrderCounts", "Order"]),
      );
    }, 250);
  }, [dispatch]);
  useEffect(() => () => clearTimeout(refreshTimer.current), []);

  const live = useOrderEvents({
    enabled: allowed,
    onRefresh: refresh,
    onEvent: (event) => {
      if (soundRef.current && ALERT_EVENTS.has(event.type)) {
        setSoundBlocked(!playAlert());
      }
    },
  });

  if (!me) return null;
  if (!allowed) return <Alert severity="warning">{t("noAccess")}</Alert>;
  const canAct = can(me.levels, "orders", "full");
  const phoneSearch = me.extras.includes("view_customer_phone");
  const c = counts.data;
  const label = (key: TabKey) =>
    c ? `${t(`tabs.${key}`)} (${c[key]})` : t(`tabs.${key}`);
  const reset = (change: () => void) => {
    change();
    setPage(1);
    setOpenId(null);
  };
  const error = (list.error ?? counts.error) as ApiError | undefined;
  const data = list.data;

  const toggleSound = async () => {
    if (sound) {
      setSound(false);
      saveSoundPreference(false);
      return;
    }
    const ok = await unlockSound();
    setSoundBlocked(!ok);
    setSound(ok);
    saveSoundPreference(ok);
    if (ok) playAlert();
  };

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Typography variant="h4" component="h1">
          {t("title")}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Chip
            size="small"
            color={live === "live" ? "success" : "default"}
            label={t(`live.${live}`)}
          />
          <Button
            variant={sound ? "contained" : "outlined"}
            onClick={toggleSound}
          >
            {sound ? t("sound.disable") : t("sound.enable")}
          </Button>
        </Stack>
      </Stack>
      {soundBlocked && <Alert severity="info">{t("sound.blocked")}</Alert>}
      <Tabs
        value={tab === "cancelled" ? "more" : tab}
        variant="scrollable"
        aria-label={t("tabs.label")}
        onChange={(_event, value: string) => {
          if (value !== "more") reset(() => setTab(value as TabKey));
        }}
      >
        {MAIN_TABS.map((key) => (
          <Tab key={key} value={key} label={label(key)} />
        ))}
        <Tab
          value="more"
          label={tab === "cancelled" ? label("cancelled") : t("tabs.more")}
          onClick={(event) => setMoreAnchor(event.currentTarget)}
        />
      </Tabs>
      <Menu
        open={!!moreAnchor}
        anchorEl={moreAnchor}
        onClose={() => setMoreAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setMoreAnchor(null);
            reset(() => setTab("cancelled"));
          }}
        >
          {label("cancelled")}
        </MenuItem>
      </Menu>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        component="form"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          reset(() => setSearch(searchText.trim()));
        }}
      >
        <TextField
          select
          size="small"
          label={t("outlet")}
          value={outletId}
          onChange={(event) =>
            reset(() =>
              setOutletId(
                event.target.value === "" ? "" : Number(event.target.value),
              ),
            )
          }
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">{t("allOutlets")}</MenuItem>
          {(outlets.data ?? []).map((outlet) => (
            <MenuItem key={outlet.id} value={outlet.id}>
              {outlet.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          type="search"
          label={phoneSearch ? t("searchPhone") : t("search")}
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          sx={{ flexGrow: 1 }}
        />
        <Button type="submit" variant="outlined">
          {t("apply")}
        </Button>
        <Button onClick={() => setShowFilters((value) => !value)}>
          {t("filter")}
        </Button>
      </Stack>
      <Collapse in={showFilters} unmountOnExit>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            size="small"
            type="date"
            label={t("dateFrom")}
            value={dateFrom}
            onChange={(event) => reset(() => setDateFrom(event.target.value))}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            size="small"
            type="date"
            label={t("dateTo")}
            value={dateTo}
            onChange={(event) => reset(() => setDateTo(event.target.value))}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Button
            onClick={() =>
              reset(() => {
                setDateFrom("");
                setDateTo("");
              })
            }
          >
            {t("clearDates")}
          </Button>
          <Button
            onClick={() =>
              reset(() => {
                setDateFrom(todayISO());
                setDateTo(todayISO());
              })
            }
          >
            {t("today")}
          </Button>
        </Stack>
      </Collapse>
      {live === "stopped" && (
        <Alert severity="warning">{t("live.closedAccess")}</Alert>
      )}
      {error && <Alert severity="error">{errorMessage(error)}</Alert>}
      {!data && !error && (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <CircularProgress size={20} />
          <Typography>{t("loading")}</Typography>
        </Stack>
      )}
      {data && data.results.length === 0 && (
        <Typography color="text.secondary">{t("empty")}</Typography>
      )}
      <Stack spacing={1} component="section" aria-label={t("title")}>
        {data?.results.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            open={openId === order.id}
            canAct={canAct}
            onToggle={() => setOpenId(openId === order.id ? null : order.id)}
          />
        ))}
      </Stack>
      {data && data.totalCount > PAGE_SIZE && (
        <TablePagination
          component="div"
          count={data.totalCount}
          page={page - 1}
          rowsPerPage={PAGE_SIZE}
          rowsPerPageOptions={[PAGE_SIZE]}
          onPageChange={(_event, next) => {
            setPage(next + 1);
            setOpenId(null);
          }}
        />
      )}
    </Stack>
  );
}
