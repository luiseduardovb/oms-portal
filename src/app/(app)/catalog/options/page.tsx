"use client";

import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
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
import {
  ItemCard,
  ItemGrid,
  ItemList,
  ItemRow,
  useViewMode,
  ViewToggle,
  type Tone,
} from "@/catalog/CatalogView";
import { currencySymbol } from "@/catalog/money";
import { fold, OptionGroupPanel } from "@/catalog/OptionGroupPanel";
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
  const [view, setView] = useViewMode();
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [menu, setMenu] = useState<{
    anchor: HTMLElement;
    group: OptionGroup;
  } | null>(null);

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

  const q = fold(search.trim());
  const shown = rows.filter(
    (g) =>
      !q ||
      fold(g.name).includes(q) ||
      g.options.some((o) => fold(o.name).includes(q)),
  );
  const opened = rows.find((g) => g.id === openId) ?? null;
  const ruleOf = (g: OptionGroup) =>
    g.selectionType === "single"
      ? t("single")
      : t("multiple", { min: g.minSelect, max: g.maxSelect }) +
        (g.allowQuantity
          ? ` · ${t("quantitiesUpTo", { count: g.maxPerOption })}`
          : "");

  const items = shown.map((group) => {
    const archived = group.archivedAt !== null;
    const active = group.options.filter((o) => o.archivedAt === null);
    const hits = q ? active.filter((o) => fold(o.name).includes(q)) : [];
    const preview = [...hits, ...active.filter((o) => !hits.includes(o))];
    const tone: Tone = archived
      ? "default"
      : group.isRequired
        ? "primary"
        : "default";
    return {
      id: group.id,
      group,
      shared: {
        name: group.name,
        hidePhoto: true,
        muted: archived,
        onOpen: () => setOpenId(group.id),
        stats: [
          { label: t("statOptions"), value: active.length },
          { label: t("statProducts"), value: group.productCount },
        ],
        status: {
          label: archived
            ? t("archived")
            : group.isRequired
              ? t("required")
              : t("optional"),
          tone,
        },
        actions: (
          <>
            {canEdit && !archived && (
              <Button
                size="small"
                aria-label={t("editGroup", { name: group.name })}
                onClick={() => setDialog({ kind: "group", group })}
              >
                {t("edit")}
              </Button>
            )}
            {canEdit && (
              <IconButton
                size="small"
                aria-label={t("more", { name: group.name })}
                onClick={(event) =>
                  setMenu({ anchor: event.currentTarget, group })
                }
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            )}
          </>
        ),
      },
      extra: (
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            {ruleOf(group)}
          </Typography>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5 }}>
            {preview.slice(0, 4).map((o) => (
              <Chip
                key={o.id}
                size="small"
                variant={hits.includes(o) ? "filled" : "outlined"}
                color={hits.includes(o) ? "primary" : "default"}
                label={o.name}
              />
            ))}
            {preview.length > 4 && (
              <Chip
                size="small"
                variant="outlined"
                label={t("moreChips", { count: preview.length - 4 })}
              />
            )}
          </Stack>
        </Stack>
      ),
    };
  });

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
      <Typography color="text.secondary">{t("help")}</Typography>
      {error && <Alert severity="error">{errorMessage(error)}</Alert>}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ alignItems: { md: "center" } }}
      >
        <TextField
          size="small"
          type="search"
          label={t("search")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ minWidth: { md: 320 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Box sx={{ flex: 1 }} />
        <ViewToggle value={view} onChange={setView} />
        <FormControlLabel
          control={
            <Switch
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
            />
          }
          label={t("showArchived")}
        />
      </Stack>
      {groups.isLoading && <CircularProgress aria-label={t("loading")} />}
      {groups.data && rows.length === 0 && (
        <Typography color="text.secondary">{t("empty")}</Typography>
      )}
      {rows.length > 0 && shown.length === 0 && (
        <Typography color="text.secondary">{t("noMatches")}</Typography>
      )}
      {shown.length > 0 &&
        (view === "grid" ? (
          <ItemGrid label={t("title")}>
            {items.map((i) => (
              <ItemCard key={i.id} {...i.shared} extra={i.extra} />
            ))}
          </ItemGrid>
        ) : (
          <ItemList label={t("title")}>
            {items.map((i) => (
              <ItemRow
                key={i.id}
                {...i.shared}
                subtitle={`${ruleOf(i.group)} · ${t("optionsCount", { count: i.group.options.filter((o) => o.archivedAt === null).length })}`}
                stats={i.shared.stats.slice(1)}
              />
            ))}
          </ItemList>
        ))}
      <Menu
        open={menu !== null}
        anchorEl={menu?.anchor}
        onClose={() => setMenu(null)}
      >
        {menu && menu.group.archivedAt === null && (
          <MenuItem
            disabled={busy || activeGroupIds.indexOf(menu.group.id) <= 0}
            onClick={() => {
              const next = moveId(activeGroupIds, menu.group.id, -1);
              if (next) reorderGroups(next);
              setMenu(null);
            }}
          >
            {t("moveUpShort")}
          </MenuItem>
        )}
        {menu && menu.group.archivedAt === null && (
          <MenuItem
            disabled={
              busy ||
              activeGroupIds.indexOf(menu.group.id) ===
                activeGroupIds.length - 1
            }
            onClick={() => {
              const next = moveId(activeGroupIds, menu.group.id, 1);
              if (next) reorderGroups(next);
              setMenu(null);
            }}
          >
            {t("moveDownShort")}
          </MenuItem>
        )}
        {menu && menu.group.archivedAt === null && (
          <MenuItem
            disabled={busy}
            onClick={() => {
              archiveGroup(menu.group.id);
              setMenu(null);
            }}
          >
            {t("archive")}
          </MenuItem>
        )}
        {menu && menu.group.archivedAt !== null && (
          <MenuItem
            disabled={busy}
            onClick={() => {
              restoreGroup(menu.group.id);
              setMenu(null);
            }}
          >
            {t("restore")}
          </MenuItem>
        )}
      </Menu>
      {opened && (
        <OptionGroupPanel
          key={opened.id}
          group={opened}
          currency={currency}
          initialQuery={search}
          canEdit={canEdit}
          canToggle={canToggle}
          busy={busy}
          rule={ruleOf(opened)}
          onClose={() => setOpenId(null)}
          onAdd={() =>
            setDialog({ kind: "option", groupId: opened.id, option: null })
          }
          onEdit={(option) =>
            setDialog({ kind: "option", groupId: opened.id, option })
          }
          onAvailability={(option) =>
            setDialog({ kind: "availability", option })
          }
          onArchive={(option) => archiveOption(option.id)}
          onRestore={(option) => restoreOption(option.id)}
          onReorder={(ids) => reorderOptions({ groupId: opened.id, ids })}
        />
      )}
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
