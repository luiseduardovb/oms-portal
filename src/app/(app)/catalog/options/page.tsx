"use client";

import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import {
  useArchiveOptionGroupMutation,
  useArchiveOptionMutation,
  useOptionGroupsQuery,
  useReorderOptionGroupsMutation,
  useReorderOptionsMutation,
  useRestoreOptionGroupMutation,
  useRestoreOptionMutation,
  type Option,
  type OptionGroup,
} from "@/catalog/catalogApi";
import { CatalogNav } from "@/catalog/CatalogNav";
import { currencySymbol, formatMoney } from "@/catalog/money";
import {
  AvailabilityDialog,
  GroupDialog,
  OptionDialog,
} from "@/catalog/OptionDialogs";
import { moveId } from "@/catalog/reorder";
import { useErrorMessage } from "@/lib/useErrorMessage";

type Dialog =
  | { kind: "group"; group: OptionGroup | null }
  | { kind: "option"; groupId: number; option: Option | null }
  | { kind: "availability"; option: Option };

export default function OptionGroupsPage() {
  const t = useTranslations("catalog.optionsPage");
  const errorMessage = useErrorMessage();
  const { data: me } = useMe();
  const [showArchived, setShowArchived] = useState(false);
  const groups = useOptionGroupsQuery(showArchived, {
    skip: !me,
    refetchOnMountOrArgChange: true,
  });
  const [archiveGroup, archivingGroup] = useArchiveOptionGroupMutation();
  const [restoreGroup, restoringGroup] = useRestoreOptionGroupMutation();
  const [reorderGroups, reorderingGroups] = useReorderOptionGroupsMutation();
  const [archiveOption, archivingOption] = useArchiveOptionMutation();
  const [restoreOption, restoringOption] = useRestoreOptionMutation();
  const [reorderOptions, reorderingOptions] = useReorderOptionsMutation();
  const [dialog, setDialog] = useState<Dialog | null>(null);

  if (!me) return null;
  if (!can(me.levels, "catalog", "view")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  const canEdit = can(me.levels, "catalog", "full") && me.outlets.all;
  const canToggle =
    can(me.levels, "catalog", "full") ||
    me.extras.includes("availability_toggle");
  const currency = me.merchant.currencyCode;
  const rows = groups.data ?? [];
  const activeGroupIds = rows
    .filter((g) => g.archivedAt === null)
    .map((g) => g.id);
  const busy =
    archivingGroup.isLoading ||
    restoringGroup.isLoading ||
    reorderingGroups.isLoading ||
    archivingOption.isLoading ||
    restoringOption.isLoading ||
    reorderingOptions.isLoading;
  const error = (groups.error ??
    archivingGroup.error ??
    restoringGroup.error ??
    reorderingGroups.error ??
    archivingOption.error ??
    restoringOption.error ??
    reorderingOptions.error) as ApiError | undefined;

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
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialog({ kind: "group", group: null })}
          >
            {t("newGroup")}
          </Button>
        )}
      </Stack>
      <CatalogNav />
      <Typography color="text.secondary">{t("help")}</Typography>
      {error && <Alert severity="error">{errorMessage(error)}</Alert>}
      <FormControlLabel
        control={
          <Switch
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
          />
        }
        label={t("showArchived")}
      />
      {groups.isLoading && <CircularProgress aria-label={t("loading")} />}
      {groups.data && rows.length === 0 && (
        <Typography color="text.secondary">{t("empty")}</Typography>
      )}
      {rows.map((group) => {
        const archived = group.archivedAt !== null;
        const at = activeGroupIds.indexOf(group.id);
        const activeOptionIds = group.options
          .filter((o) => o.archivedAt === null)
          .map((o) => o.id);
        return (
          <Paper
            key={group.id}
            variant="outlined"
            component="section"
            aria-label={group.name}
            sx={{ p: 2 }}
          >
            <Stack spacing={2}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", flexWrap: "wrap" }}
              >
                <Typography variant="h6" component="h2" sx={{ mr: 1 }}>
                  {group.name}
                </Typography>
                <Chip
                  size="small"
                  label={
                    group.selectionType === "single"
                      ? t("single")
                      : t("multiple", {
                          min: group.minSelect,
                          max: group.maxSelect,
                        })
                  }
                />
                {group.isRequired && (
                  <Chip size="small" color="primary" label={t("required")} />
                )}
                <Chip
                  size="small"
                  variant="outlined"
                  label={t("products", { count: group.productCount })}
                />
                {archived && <Chip size="small" label={t("archived")} />}
                <span style={{ flexGrow: 1 }} />
                {canEdit && !archived && (
                  <>
                    <IconButton
                      size="small"
                      aria-label={t("moveUp", { name: group.name })}
                      disabled={busy || at <= 0}
                      onClick={() => {
                        const next = moveId(activeGroupIds, group.id, -1);
                        if (next) reorderGroups(next);
                      }}
                    >
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      aria-label={t("moveDown", { name: group.name })}
                      disabled={busy || at === activeGroupIds.length - 1}
                      onClick={() => {
                        const next = moveId(activeGroupIds, group.id, 1);
                        if (next) reorderGroups(next);
                      }}
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                    <Button
                      size="small"
                      aria-label={t("editGroup", { name: group.name })}
                      onClick={() => setDialog({ kind: "group", group })}
                    >
                      {t("edit")}
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      aria-label={t("archiveGroup", { name: group.name })}
                      disabled={busy}
                      onClick={() => archiveGroup(group.id)}
                    >
                      {t("archive")}
                    </Button>
                  </>
                )}
                {canEdit && archived && (
                  <Button
                    size="small"
                    aria-label={t("restoreGroup", { name: group.name })}
                    disabled={busy}
                    onClick={() => restoreGroup(group.id)}
                  >
                    {t("restore")}
                  </Button>
                )}
              </Stack>
              {group.options.length === 0 && (
                <Typography color="text.secondary">{t("noOptions")}</Typography>
              )}
              {group.options.length > 0 && (
                <Table
                  size="small"
                  aria-label={t("optionsTable", { name: group.name })}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>{t("option")}</TableCell>
                      <TableCell align="right">{t("priceDelta")}</TableCell>
                      <TableCell align="right">{t("actions")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.options.map((option) => {
                      const optionArchived = option.archivedAt !== null;
                      const spot = activeOptionIds.indexOf(option.id);
                      return (
                        <TableRow key={option.id}>
                          <TableCell>
                            {option.name}
                            {option.isDefault && (
                              <Chip
                                size="small"
                                sx={{ ml: 1 }}
                                label={t("default")}
                              />
                            )}
                            {optionArchived && (
                              <Chip
                                size="small"
                                sx={{ ml: 1 }}
                                label={t("archived")}
                              />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {Number(option.priceDelta) > 0 ? "+" : ""}
                            {formatMoney(option.priceDelta, currency)}
                          </TableCell>
                          <TableCell align="right">
                            {canEdit && !archived && !optionArchived && (
                              <>
                                <IconButton
                                  size="small"
                                  aria-label={t("moveUp", {
                                    name: option.name,
                                  })}
                                  disabled={busy || spot <= 0}
                                  onClick={() => {
                                    const next = moveId(
                                      activeOptionIds,
                                      option.id,
                                      -1,
                                    );
                                    if (next)
                                      reorderOptions({
                                        groupId: group.id,
                                        ids: next,
                                      });
                                  }}
                                >
                                  <ArrowUpwardIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  aria-label={t("moveDown", {
                                    name: option.name,
                                  })}
                                  disabled={
                                    busy || spot === activeOptionIds.length - 1
                                  }
                                  onClick={() => {
                                    const next = moveId(
                                      activeOptionIds,
                                      option.id,
                                      1,
                                    );
                                    if (next)
                                      reorderOptions({
                                        groupId: group.id,
                                        ids: next,
                                      });
                                  }}
                                >
                                  <ArrowDownwardIcon fontSize="small" />
                                </IconButton>
                                <Button
                                  size="small"
                                  aria-label={t("editOption", {
                                    name: option.name,
                                  })}
                                  onClick={() =>
                                    setDialog({
                                      kind: "option",
                                      groupId: group.id,
                                      option,
                                    })
                                  }
                                >
                                  {t("edit")}
                                </Button>
                              </>
                            )}
                            {canToggle && !archived && !optionArchived && (
                              <Button
                                size="small"
                                aria-label={t("outletsOf", {
                                  name: option.name,
                                })}
                                onClick={() =>
                                  setDialog({ kind: "availability", option })
                                }
                              >
                                {t("outlets")}
                              </Button>
                            )}
                            {canEdit && !archived && !optionArchived && (
                              <Button
                                size="small"
                                color="error"
                                aria-label={t("archiveOption", {
                                  name: option.name,
                                })}
                                disabled={busy}
                                onClick={() => archiveOption(option.id)}
                              >
                                {t("archive")}
                              </Button>
                            )}
                            {canEdit && !archived && optionArchived && (
                              <Button
                                size="small"
                                aria-label={t("restoreOption", {
                                  name: option.name,
                                })}
                                disabled={busy}
                                onClick={() => restoreOption(option.id)}
                              >
                                {t("restore")}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              {canEdit && !archived && (
                <div>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    aria-label={t("addOptionTo", { name: group.name })}
                    onClick={() =>
                      setDialog({
                        kind: "option",
                        groupId: group.id,
                        option: null,
                      })
                    }
                  >
                    {t("addOption")}
                  </Button>
                </div>
              )}
            </Stack>
          </Paper>
        );
      })}
      {dialog?.kind === "group" && (
        <GroupDialog group={dialog.group} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "option" && (
        <OptionDialog
          groupId={dialog.groupId}
          option={dialog.option}
          currency={currencySymbol(currency)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "availability" && (
        <AvailabilityDialog
          option={dialog.option}
          onClose={() => setDialog(null)}
        />
      )}
    </Stack>
  );
}
