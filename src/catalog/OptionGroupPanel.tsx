"use client";

import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CloseIcon from "@mui/icons-material/Close";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Option, OptionGroup } from "@/catalog/catalogApi";
import { ItemList, ItemRow } from "@/catalog/CatalogView";
import { formatMoney } from "@/catalog/money";
import { moveId } from "@/catalog/reorder";

/** Lower case without accents, so "cafe" finds "Café". */
export function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

const MANY = 6;

interface Props {
  group: OptionGroup;
  currency: string;
  initialQuery: string;
  canEdit: boolean;
  canToggle: boolean;
  busy: boolean;
  rule: string;
  onClose: () => void;
  onAdd: () => void;
  onEdit: (option: Option) => void;
  onAvailability: (option: Option) => void;
  onArchive: (option: Option) => void;
  onRestore: (option: Option) => void;
  onReorder: (ids: number[]) => void;
}

/** One group's options in a side panel: search, add, edit, reorder. */
export function OptionGroupPanel(props: Props) {
  const { group, currency, canEdit, canToggle, busy } = props;
  const t = useTranslations("catalog.optionsPage");
  const [query, setQuery] = useState(props.initialQuery);
  const [menu, setMenu] = useState<{
    anchor: HTMLElement;
    option: Option;
  } | null>(null);
  const groupArchived = group.archivedAt !== null;
  const activeIds = group.options
    .filter((o) => o.archivedAt === null)
    .map((o) => o.id);
  const q = fold(query.trim());
  const shown = group.options.filter((o) => !q || fold(o.name).includes(q));

  return (
    <Drawer
      anchor="right"
      open
      onClose={props.onClose}
      sx={{ zIndex: (theme) => theme.zIndex.modal }}
      slotProps={{
        paper: {
          "aria-label": t("panel", { name: group.name }),
          sx: { width: { xs: "100%", sm: 480 } },
        },
      }}
    >
      <Stack spacing={2} sx={{ p: 2.5, height: "100%" }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" component="h2">
              {group.name}
            </Typography>
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ flexWrap: "wrap", rowGap: 0.75, mt: 0.5 }}
            >
              <Chip size="small" label={props.rule} />
              {group.isRequired && (
                <Chip size="small" color="primary" label={t("required")} />
              )}
              <Chip
                size="small"
                variant="outlined"
                label={t("products", { count: group.productCount })}
              />
            </Stack>
          </Box>
          <IconButton aria-label={t("close")} onClick={props.onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
        {canEdit && !groupArchived && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            aria-label={t("addOptionTo", { name: group.name })}
            onClick={props.onAdd}
          >
            {t("addOption")}
          </Button>
        )}
        {group.options.length > MANY && (
          <TextField
            size="small"
            type="search"
            label={t("searchOptions")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
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
        )}
        <Box sx={{ flex: 1, overflowY: "auto", pr: 0.5 }}>
          {group.options.length === 0 && (
            <Typography color="text.secondary">{t("noOptions")}</Typography>
          )}
          {group.options.length > 0 && shown.length === 0 && (
            <Typography color="text.secondary">{t("noMatches")}</Typography>
          )}
          {shown.length > 0 && (
            <ItemList label={t("optionsTable", { name: group.name })}>
              {shown.map((option) => {
                const archived = option.archivedAt !== null;
                const spot = activeIds.indexOf(option.id);
                const editable = canEdit && !groupArchived && !archived;
                const delta = Number(option.priceDelta) > 0 ? "+" : "";
                return (
                  <ItemRow
                    key={option.id}
                    hidePhoto
                    name={option.name}
                    muted={archived}
                    stats={[
                      {
                        label: t("priceShort"),
                        value: `${delta}${formatMoney(option.priceDelta, currency)}`,
                      },
                    ]}
                    status={
                      archived
                        ? { label: t("archived"), tone: "default" }
                        : option.isDefault
                          ? { label: t("default"), tone: "primary" }
                          : undefined
                    }
                    actions={
                      <>
                        {editable && (
                          <>
                            <IconButton
                              size="small"
                              aria-label={t("moveUp", { name: option.name })}
                              disabled={busy || spot <= 0}
                              onClick={() => {
                                const next = moveId(activeIds, option.id, -1);
                                if (next) props.onReorder(next);
                              }}
                            >
                              <ArrowUpwardIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              aria-label={t("moveDown", { name: option.name })}
                              disabled={busy || spot === activeIds.length - 1}
                              onClick={() => {
                                const next = moveId(activeIds, option.id, 1);
                                if (next) props.onReorder(next);
                              }}
                            >
                              <ArrowDownwardIcon fontSize="small" />
                            </IconButton>
                            <Button
                              size="small"
                              aria-label={t("editOption", {
                                name: option.name,
                              })}
                              onClick={() => props.onEdit(option)}
                            >
                              {t("edit")}
                            </Button>
                          </>
                        )}
                        {(editable ||
                          (canToggle && !groupArchived && !archived) ||
                          (canEdit && !groupArchived && archived)) && (
                          <IconButton
                            size="small"
                            aria-label={t("moreOption", { name: option.name })}
                            onClick={(event) =>
                              setMenu({
                                anchor: event.currentTarget,
                                option,
                              })
                            }
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        )}
                      </>
                    }
                  />
                );
              })}
            </ItemList>
          )}
        </Box>
      </Stack>
      <Menu
        open={menu !== null}
        anchorEl={menu?.anchor}
        onClose={() => setMenu(null)}
      >
        {menu && canToggle && menu.option.archivedAt === null && (
          <MenuItem
            onClick={() => {
              props.onAvailability(menu.option);
              setMenu(null);
            }}
          >
            {t("outlets")}
          </MenuItem>
        )}
        {menu && canEdit && menu.option.archivedAt === null && (
          <MenuItem
            disabled={busy}
            onClick={() => {
              props.onArchive(menu.option);
              setMenu(null);
            }}
          >
            {t("archive")}
          </MenuItem>
        )}
        {menu && canEdit && menu.option.archivedAt !== null && (
          <MenuItem
            disabled={busy}
            onClick={() => {
              props.onRestore(menu.option);
              setMenu(null);
            }}
          >
            {t("restore")}
          </MenuItem>
        )}
      </Menu>
    </Drawer>
  );
}
