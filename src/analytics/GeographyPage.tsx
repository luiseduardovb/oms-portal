"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import InputAdornment from "@mui/material/InputAdornment";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { formatMoney } from "@/catalog/money";
import { PageFrame } from "@/components/PageFrame";
import { useErrorMessage } from "@/lib/useErrorMessage";
import {
  downloadGeography,
  useAreasQuery,
  useMapCellsQuery,
  useBranchesQuery,
} from "./analyticsApi";
import { AreaMap, LEVEL_OPACITY } from "./AreaMap";
import { FilterBar } from "./FilterBar";
import { useFilters } from "./useFilters";

const NO_ZONE = "";

/** "Geografía": sales by branch and, opening a branch, by delivery area. */
export function GeographyPage() {
  const t = useTranslations("analytics");
  const errorMessage = useErrorMessage();
  const { data: me } = useMe();
  const { filters, change } = useFilters();
  const [search, setSearch] = useState("");
  const branches = useBranchesQuery(
    { ...filters, outletId: null },
    { skip: !me },
  );
  const areas = useAreasQuery(filters, { skip: !me });
  const cells = useMapCellsQuery(filters, { skip: !me });
  if (!me) return null;
  if (!can(me.levels, "analytics", "view")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  const currency = me.merchant.currencyCode;
  const m = (v: string) => formatMoney(v, currency);
  const open = filters.outletId;
  const needle = search.trim().toLowerCase();
  const branchRows = (branches.data ?? []).filter((b) =>
    b.name.toLowerCase().includes(needle),
  );
  const areaRows = (areas.data ?? []).filter((a) =>
    (a.name ?? t("geo.noZone")).toLowerCase().includes(needle),
  );
  const openName =
    branches.data?.find((b) => b.outletId === open)?.name ?? t("geo.branch");
  const failure = (branches.error ?? areas.error) as ApiError | undefined;
  return (
    <PageFrame
      section={t("section")}
      title={t("geo.title")}
      maxWidth={1200}
      actions={
        <Button
          variant="outlined"
          onClick={() =>
            void downloadGeography(filters, open ? "areas" : "branches")
          }
        >
          {t("export")}
        </Button>
      }
    >
      <FilterBar filters={filters} onChange={change} />
      {failure && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage(failure)}
        </Alert>
      )}
      <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {t("geo.map")}
        </Typography>
        <AreaMap areas={cells.data ?? []} />
        <Stack
          direction="row"
          sx={{ gap: 2, flexWrap: "wrap", alignItems: "center", mt: 1 }}
        >
          <Typography variant="body2" color="text.secondary">
            {t("geo.legend")}
          </Typography>
          {["0–25 %", "26–50 %", "51–75 %", "76–100 %"].map((label, i) => (
            <Stack
              key={label}
              direction="row"
              sx={{ alignItems: "center", gap: 0.75 }}
            >
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  bgcolor: "primary.main",
                  opacity: LEVEL_OPACITY[i],
                }}
              />
              <Typography variant="body2">{label}</Typography>
            </Stack>
          ))}
        </Stack>
      </Card>

      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
          mb: 1.5,
        }}
      >
        <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
          {open && (
            <Button onClick={() => change({ outletId: null })}>
              {t("geo.back")}
            </Button>
          )}
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {open ? t("geo.areasOf", { name: openName }) : t("geo.branches")}
          </Typography>
        </Stack>
        <TextField
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("geo.search")}
          slotProps={{
            htmlInput: { "aria-label": t("geo.search") },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      </Stack>
      {branches.isLoading || areas.isLoading ? (
        <Skeleton variant="rounded" height={240} />
      ) : (
        <Card variant="outlined">
          <TableContainer>
            <Table size="small" sx={{ "& td, & th": { whiteSpace: "nowrap" } }}>
              <TableHead>
                <TableRow>
                  <TableCell>
                    {open ? t("geo.area") : t("geo.branch")}
                  </TableCell>
                  <TableCell align="right">{t("kpi.sales")}</TableCell>
                  <TableCell align="right">{t("kpi.averageOrder")}</TableCell>
                  {!open && (
                    <>
                      <TableCell align="right">
                        {t("geo.deliveryOrders")}
                      </TableCell>
                      <TableCell align="right">
                        {t("geo.pickupOrders")}
                      </TableCell>
                    </>
                  )}
                  <TableCell align="right">{t("kpi.orders")}</TableCell>
                  <TableCell align="right">{t("kpi.customers")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!open &&
                  branchRows.map((b) => (
                    <TableRow
                      key={b.outletId}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => change({ outletId: b.outletId })}
                    >
                      <TableCell>
                        <Button size="small" sx={{ textTransform: "none" }}>
                          {b.name}
                        </Button>
                      </TableCell>
                      <TableCell align="right">{m(b.sales)}</TableCell>
                      <TableCell align="right">{m(b.averageOrder)}</TableCell>
                      <TableCell align="right">{b.deliveryOrders}</TableCell>
                      <TableCell align="right">{b.pickupOrders}</TableCell>
                      <TableCell align="right">{b.orders}</TableCell>
                      <TableCell align="right">{b.customers}</TableCell>
                    </TableRow>
                  ))}
                {open &&
                  areaRows.map((a) => (
                    <TableRow key={a.name ?? NO_ZONE} hover>
                      <TableCell>{a.name ?? t("geo.noZone")}</TableCell>
                      <TableCell align="right">{m(a.sales)}</TableCell>
                      <TableCell align="right">{m(a.averageOrder)}</TableCell>
                      <TableCell align="right">{a.orders}</TableCell>
                      <TableCell align="right">{a.customers}</TableCell>
                    </TableRow>
                  ))}
                {(open ? areaRows : branchRows).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      {t("empty")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </PageFrame>
  );
}
