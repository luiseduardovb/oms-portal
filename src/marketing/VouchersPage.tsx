"use client";

import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
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
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { useErrorMessage } from "@/lib/useErrorMessage";
import {
  useArchiveVoucherMutation,
  useToggleVoucherMutation,
  useVouchersQuery,
  type Voucher,
  type VoucherStatus,
} from "./vouchersApi";

type Tab = "all" | VoucherStatus;
const TABS: Tab[] = ["all", "active", "deactivated", "scheduled", "expired"];
const COLORS: Record<VoucherStatus, "success" | "default" | "info" | "error"> =
  {
    active: "success",
    deactivated: "default",
    scheduled: "info",
    expired: "error",
  };

function day(value: string | null | undefined, empty: string): string {
  if (!value) return empty;
  return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function VouchersPage() {
  const t = useTranslations("vouchers");
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const { data: me } = useMe();
  const vouchers = useVouchersQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [toggle] = useToggleVoucherMutation();
  const [archive] = useArchiveVoucherMutation();
  const [tab, setTab] = useState<Tab>("all");
  const [archiving, setArchiving] = useState<Voucher | null>(null);
  const [menu, setMenu] = useState<{
    el: HTMLElement;
    voucher: Voucher;
  } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  if (!me) return null;
  const seesAll = can(me.levels, "marketing", "view");
  const canManage = can(me.levels, "marketing", "full");
  const shown = (vouchers.data ?? []).filter(
    (v) => tab === "all" || v.status === tab,
  );

  const run = async (action: Promise<{ error?: unknown }>) => {
    setFailure(null);
    const result = await action;
    if (result.error) setFailure(errorMessage(result.error as ApiError));
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Typography variant="h4" component="h1">
          {t("title")}
        </Typography>
        {(canManage || !seesAll) && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            component={Link}
            href="/marketing/vouchers/new"
          >
            {t("add")}
          </Button>
        )}
      </Stack>
      {(vouchers.error || failure) && (
        <Alert severity="error">
          {failure ?? errorMessage(vouchers.error as ApiError)}
        </Alert>
      )}
      <Tabs
        value={tab}
        onChange={(_, value: Tab) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
      >
        {TABS.map((value) => (
          <Tab key={value} value={value} label={t(`tabs.${value}`)} />
        ))}
      </Tabs>
      {vouchers.isLoading ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress aria-label={t("loading")} />
        </Box>
      ) : shown.length === 0 ? (
        <Typography color="text.secondary">{t("empty")}</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("columns.code")}</TableCell>
                <TableCell>{t("columns.type")}</TableCell>
                <TableCell>{t("columns.usage")}</TableCell>
                <TableCell>{t("columns.from")}</TableCell>
                <TableCell>{t("columns.to")}</TableCell>
                <TableCell>{t("columns.status")}</TableCell>
                <TableCell>{t("columns.publish")}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {shown.map((v) => {
                // A role with only the private-voucher extra may touch private ones.
                const editable =
                  canManage || (!seesAll && v.visibility === "private");
                return (
                  <TableRow key={v.id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{v.code}</TableCell>
                    <TableCell>{t(`types.${v.type}`)}</TableCell>
                    <TableCell>
                      {v.redeemedCount} / {v.totalUsageLimit ?? "∞"}
                    </TableCell>
                    <TableCell>{day(v.startsAt, "—")}</TableCell>
                    <TableCell>{day(v.endsAt, t("unlimited"))}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={COLORS[v.status]}
                        variant={
                          v.status === "deactivated" ? "outlined" : "filled"
                        }
                        label={t(`status.${v.status}`)}
                      />
                    </TableCell>
                    <TableCell>
                      <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={v.visibility}
                        disabled={!canManage}
                        onChange={(_, value: Voucher["visibility"] | null) => {
                          if (value && value !== v.visibility) {
                            void run(toggle({ id: v.id, visibility: value }));
                          }
                        }}
                        aria-label={t("columns.publish")}
                      >
                        <ToggleButton value="public">
                          {t("visibility.public")}
                        </ToggleButton>
                        <ToggleButton value="private">
                          {t("visibility.private")}
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </TableCell>
                    <TableCell align="right">
                      {editable && (
                        <IconButton
                          aria-label={t("rowMenu", { code: v.code })}
                          onClick={(event) =>
                            setMenu({ el: event.currentTarget, voucher: v })
                          }
                        >
                          <MoreVertIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Menu
        open={menu !== null}
        anchorEl={menu?.el}
        onClose={() => setMenu(null)}
      >
        <MenuItem
          onClick={() => {
            if (menu) router.push(`/marketing/vouchers/${menu.voucher.id}`);
            setMenu(null);
          }}
        >
          {t("edit")}
        </MenuItem>
        <MenuItem
          onClick={() => {
            const v = menu?.voucher;
            setMenu(null);
            if (v) void run(toggle({ id: v.id, isActive: !v.isActive }));
          }}
        >
          {menu?.voucher.isActive ? t("deactivate") : t("activate")}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setArchiving(menu?.voucher ?? null);
            setMenu(null);
          }}
        >
          {t("archive")}
        </MenuItem>
      </Menu>
      <Dialog open={archiving !== null} onClose={() => setArchiving(null)}>
        <DialogTitle>
          {t("archiveTitle", { code: archiving?.code ?? "" })}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>{t("archiveBody")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiving(null)}>{t("cancel")}</Button>
          <Button
            color="error"
            onClick={() => {
              const v = archiving;
              setArchiving(null);
              if (v) void run(archive(v.id));
            }}
          >
            {t("archive")}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
