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
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import { useErrorMessage } from "@/lib/useErrorMessage";
import {
  useArchivePromotionMutation,
  usePromotionsQuery,
  useTogglePromotionMutation,
  type Promotion,
  type PromotionStatus,
} from "./promotionsApi";

type Tab = "all" | PromotionStatus;
const TABS: Tab[] = ["all", "active", "deactivated", "scheduled", "expired"];
const COLORS: Record<
  PromotionStatus,
  "success" | "default" | "info" | "error"
> = {
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

export function PromotionsPage() {
  const t = useTranslations("promotions");
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const { data: me } = useMe();
  const promotions = usePromotionsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [toggle] = useTogglePromotionMutation();
  const [archive] = useArchivePromotionMutation();
  const [tab, setTab] = useState<Tab>("all");
  const [archiving, setArchiving] = useState<Promotion | null>(null);
  const [menu, setMenu] = useState<{
    el: HTMLElement;
    promotion: Promotion;
  } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  if (!me) return null;
  if (!can(me.levels, "marketing", "view")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  const canManage = can(me.levels, "marketing", "full");
  const shown = (promotions.data ?? []).filter(
    (p) => tab === "all" || p.status === tab,
  );

  const run = async (action: Promise<{ error?: unknown }>) => {
    setFailure(null);
    const result = await action;
    if (result.error) setFailure(errorMessage(result.error as ApiError));
  };

  const what = (p: Promotion) =>
    p.type === "percentage"
      ? t("what.percentage", { value: Number(p.value) })
      : p.type === "amount"
        ? t("what.amount", { value: Number(p.value).toFixed(2) })
        : t("what.free_delivery");

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
        {canManage && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            component={Link}
            href="/marketing/promotions/new"
          >
            {t("add")}
          </Button>
        )}
      </Stack>
      <Typography color="text.secondary">{t("intro")}</Typography>
      {(promotions.error || failure) && (
        <Alert severity="error">
          {failure ?? errorMessage(promotions.error as ApiError)}
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
      {promotions.isLoading ? (
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
                <TableCell>{t("columns.name")}</TableCell>
                <TableCell>{t("columns.discount")}</TableCell>
                <TableCell>{t("columns.scope")}</TableCell>
                <TableCell>{t("columns.from")}</TableCell>
                <TableCell>{t("columns.to")}</TableCell>
                <TableCell>{t("columns.status")}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {shown.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{p.name}</TableCell>
                  <TableCell>{what(p)}</TableCell>
                  <TableCell>{t(`scope.${p.scope}`)}</TableCell>
                  <TableCell>{day(p.startsAt, "—")}</TableCell>
                  <TableCell>{day(p.endsAt, t("unlimited"))}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={COLORS[p.status]}
                      variant={
                        p.status === "deactivated" ? "outlined" : "filled"
                      }
                      label={t(`status.${p.status}`)}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {canManage && (
                      <IconButton
                        aria-label={t("rowMenu", { name: p.name })}
                        onClick={(event) =>
                          setMenu({ el: event.currentTarget, promotion: p })
                        }
                      >
                        <MoreVertIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
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
            if (menu) router.push(`/marketing/promotions/${menu.promotion.id}`);
            setMenu(null);
          }}
        >
          {t("edit")}
        </MenuItem>
        <MenuItem
          onClick={() => {
            const p = menu?.promotion;
            setMenu(null);
            if (p) void run(toggle({ id: p.id, isActive: !p.isActive }));
          }}
        >
          {menu?.promotion.isActive ? t("deactivate") : t("activate")}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setArchiving(menu?.promotion ?? null);
            setMenu(null);
          }}
        >
          {t("archive")}
        </MenuItem>
      </Menu>
      <Dialog open={archiving !== null} onClose={() => setArchiving(null)}>
        <DialogTitle>
          {t("archiveTitle", { name: archiving?.name ?? "" })}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>{t("archiveBody")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiving(null)}>{t("cancel")}</Button>
          <Button
            color="error"
            onClick={() => {
              const p = archiving;
              setArchiving(null);
              if (p) void run(archive(p.id));
            }}
          >
            {t("archive")}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
