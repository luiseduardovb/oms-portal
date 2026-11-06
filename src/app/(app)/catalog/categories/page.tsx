"use client";

import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
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
import { CatalogNav } from "@/catalog/CatalogNav";
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
      <CatalogNav />
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
      {categories.isLoading && <CircularProgress aria-label={t("loading")} />}
      {categories.data && rows.length === 0 && (
        <Typography color="text.secondary">{t("empty")}</Typography>
      )}
      {rows.length > 0 && (
        <TableContainer>
          <Table size="small" aria-label={t("table")}>
            <TableHead>
              <TableRow>
                <TableCell>{t("name")}</TableCell>
                <TableCell align="right">{t("products")}</TableCell>
                <TableCell>{t("published")}</TableCell>
                {canEdit && <TableCell align="right">{t("actions")}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((category) => {
                const archived = category.archivedAt !== null;
                const at = activeIds.indexOf(category.id);
                return (
                  <TableRow key={category.id}>
                    <TableCell>
                      {category.name}
                      {archived && (
                        <Chip
                          size="small"
                          sx={{ ml: 1 }}
                          label={t("archived")}
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">{category.productCount}</TableCell>
                    <TableCell>
                      <Switch
                        checked={category.isPublished}
                        disabled={!canEdit || archived || busy}
                        slotProps={{
                          input: {
                            "aria-label": t("publish", {
                              name: category.name,
                            }),
                          },
                        }}
                        onChange={(event) =>
                          update({
                            id: category.id,
                            changes: { isPublished: event.target.checked },
                          })
                        }
                      />
                    </TableCell>
                    {canEdit && (
                      <TableCell align="right">
                        {!archived && (
                          <>
                            <IconButton
                              size="small"
                              aria-label={t("moveUp", { name: category.name })}
                              disabled={busy || at <= 0}
                              onClick={() => move(category.id, -1)}
                            >
                              <ArrowUpwardIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              aria-label={t("moveDown", {
                                name: category.name,
                              })}
                              disabled={busy || at === activeIds.length - 1}
                              onClick={() => move(category.id, 1)}
                            >
                              <ArrowDownwardIcon fontSize="small" />
                            </IconButton>
                            <Button
                              size="small"
                              aria-label={t("rename", { name: category.name })}
                              onClick={() => setEditing(category)}
                            >
                              {t("edit")}
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              aria-label={t("archiveAria", {
                                name: category.name,
                              })}
                              disabled={busy}
                              onClick={() => archive(category.id)}
                            >
                              {t("archive")}
                            </Button>
                          </>
                        )}
                        {archived && (
                          <Button
                            size="small"
                            aria-label={t("restoreAria", {
                              name: category.name,
                            })}
                            disabled={busy}
                            onClick={() => restore(category.id)}
                          >
                            {t("restore")}
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
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
