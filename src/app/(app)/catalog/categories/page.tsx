"use client";

import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ApiError } from "@/api/apiError";
import { can } from "@/auth/permissions";
import { useMe } from "@/auth/useSession";
import {
  useArchiveCategoryMutation,
  useCategoriesQuery,
  useCreateCategoryMutation,
  useReorderCategoriesMutation,
  useRestoreCategoryMutation,
  useUpdateCategoryMutation,
  type Category,
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
import { moveId } from "@/catalog/reorder";
import { useErrorMessage } from "@/lib/useErrorMessage";

export default function CategoriesPage() {
  const t = useTranslations("catalog.categoryPage");
  const errorMessage = useErrorMessage();
  const { data: me } = useMe();
  const [showArchived, setShowArchived] = useState(false);
  const categories = useCategoriesQuery(showArchived, {
    skip: !me,
    refetchOnMountOrArgChange: true,
  });
  const [update, updating] = useUpdateCategoryMutation();
  const [archive, archiving] = useArchiveCategoryMutation();
  const [restore, restoring] = useRestoreCategoryMutation();
  const [reorder, reordering] = useReorderCategoriesMutation();
  const [view, setView] = useViewMode();
  const [menu, setMenu] = useState<{
    anchor: HTMLElement;
    category: Category;
  } | null>(null);
  const [editing, setEditing] = useState<Category | "new" | null>(null);

  if (!me) return null;
  if (!can(me.levels, "catalog", "view")) {
    return <Alert severity="warning">{t("noAccess")}</Alert>;
  }
  const canEdit = can(me.levels, "catalog", "full") && me.outlets.all;
  const rows = categories.data ?? [];
  const activeIds = rows.filter((c) => c.archivedAt === null).map((c) => c.id);
  const busy =
    updating.isLoading ||
    archiving.isLoading ||
    restoring.isLoading ||
    reordering.isLoading;
  const error = (categories.error ??
    updating.error ??
    archiving.error ??
    restoring.error ??
    reordering.error) as ApiError | undefined;

  const move = (id: number, direction: -1 | 1) => {
    const next = moveId(activeIds, id, direction);
    if (next) reorder(next);
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
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setEditing("new")}
          >
            {t("new")}
          </Button>
        )}
      </Stack>
      {error && <Alert severity="error">{errorMessage(error)}</Alert>}
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
            />
          }
          label={t("showArchived")}
        />
        <ViewToggle value={view} onChange={setView} />
      </Stack>
      {categories.isLoading && <CircularProgress aria-label={t("loading")} />}
      {categories.data && rows.length === 0 && (
        <Typography color="text.secondary">{t("empty")}</Typography>
      )}
      {rows.length > 0 && (
        <CategoryItems
          rows={rows}
          view={view}
          label={t("table")}
          canEdit={canEdit}
          busy={busy}
          activeIds={activeIds}
          onMove={move}
          onEdit={setEditing}
          onMenu={(anchor, category) => setMenu({ anchor, category })}
          onPublish={(category, isPublished) =>
            update({ id: category.id, changes: { isPublished } })
          }
        />
      )}
      <Menu
        open={menu !== null}
        anchorEl={menu?.anchor}
        onClose={() => setMenu(null)}
      >
        {menu && menu.category.archivedAt === null && (
          <MenuItem
            disabled={busy}
            onClick={() => {
              archive(menu.category.id);
              setMenu(null);
            }}
          >
            {t("archive")}
          </MenuItem>
        )}
        {menu && menu.category.archivedAt !== null && (
          <MenuItem
            disabled={busy}
            onClick={() => {
              restore(menu.category.id);
              setMenu(null);
            }}
          >
            {t("restore")}
          </MenuItem>
        )}
      </Menu>
      {editing !== null && (
        <CategoryDialog
          category={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Stack>
  );
}

function CategoryDialog({
  category,
  onClose,
}: {
  category: Category | null;
  onClose: () => void;
}) {
  const t = useTranslations("catalog.categoryDialog");
  const errorMessage = useErrorMessage();
  const [create, creating] = useCreateCategoryMutation();
  const [update, updating] = useUpdateCategoryMutation();
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [missing, setMissing] = useState(false);
  const error = (creating.error ?? updating.error) as ApiError | undefined;

  const submit = async () => {
    if (name.trim() === "") {
      setMissing(true);
      return;
    }
    setMissing(false);
    const text = description.trim() === "" ? null : description.trim();
    const result = category
      ? await update({
          id: category.id,
          changes: { name: name.trim(), description: text },
        })
      : await create({
          name: name.trim(),
          description: text,
          isPublished: true,
        });
    if ("data" in result && result.data) onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{category ? t("editTitle") : t("newTitle")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{errorMessage(error)}</Alert>}
          <TextField
            label={t("name")}
            value={name}
            autoFocus
            error={missing}
            helperText={missing ? t("nameRequired") : undefined}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            label={t("description")}
            value={description}
            multiline
            minRows={2}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("cancel")}</Button>
        <Button
          variant="contained"
          disabled={creating.isLoading || updating.isLoading}
          onClick={submit}
        >
          {t("save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CategoryItems({
  rows,
  view,
  label,
  canEdit,
  busy,
  activeIds,
  onMove,
  onEdit,
  onMenu,
  onPublish,
}: {
  rows: Category[];
  view: "grid" | "list";
  label: string;
  canEdit: boolean;
  busy: boolean;
  activeIds: number[];
  onMove: (id: number, direction: -1 | 1) => void;
  onEdit: (category: Category) => void;
  onMenu: (anchor: HTMLElement, category: Category) => void;
  onPublish: (category: Category, isPublished: boolean) => void;
}) {
  const t = useTranslations("catalog.categoryPage");
  const items = rows.map((category) => {
    const archived = category.archivedAt !== null;
    const at = activeIds.indexOf(category.id);
    const tone: Tone = archived
      ? "default"
      : category.isPublished
        ? "success"
        : "warning";
    return {
      id: category.id,
      name: category.name,
      image: category.image?.thumbUrl ?? null,
      muted: archived,
      stats: [{ label: t("products"), value: category.productCount }],
      status: {
        label: archived
          ? t("archived")
          : category.isPublished
            ? t("live")
            : t("hidden"),
        tone,
      },
      actions: (
        <>
          <Switch
            size="small"
            checked={category.isPublished}
            disabled={!canEdit || archived || busy}
            slotProps={{
              input: { "aria-label": t("publish", { name: category.name }) },
            }}
            onChange={(event) => onPublish(category, event.target.checked)}
          />
          {canEdit && !archived && (
            <>
              <IconButton
                size="small"
                aria-label={t("moveUp", { name: category.name })}
                disabled={busy || at <= 0}
                onClick={() => onMove(category.id, -1)}
              >
                <ArrowUpwardIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                aria-label={t("moveDown", { name: category.name })}
                disabled={busy || at === activeIds.length - 1}
                onClick={() => onMove(category.id, 1)}
              >
                <ArrowDownwardIcon fontSize="small" />
              </IconButton>
              <Button
                size="small"
                aria-label={t("rename", { name: category.name })}
                onClick={() => onEdit(category)}
              >
                {t("edit")}
              </Button>
            </>
          )}
          {canEdit && (
            <IconButton
              size="small"
              aria-label={t("more", { name: category.name })}
              onClick={(event) => onMenu(event.currentTarget, category)}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          )}
        </>
      ),
    };
  });
  return view === "grid" ? (
    <ItemGrid label={label}>
      {items.map((item) => (
        <ItemCard key={item.id} {...item} />
      ))}
    </ItemGrid>
  ) : (
    <ItemList label={label}>
      {items.map((item) => (
        <ItemRow key={item.id} {...item} />
      ))}
    </ItemList>
  );
}
