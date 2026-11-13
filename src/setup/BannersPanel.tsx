"use client";

import AddPhotoAlternateOutlined from "@mui/icons-material/AddPhotoAlternateOutlined";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import type { ApiError } from "@/api/apiError";
import { useCategoriesQuery, useProductsQuery } from "@/catalog/catalogApi";
import { PHOTO_TYPES, useImageUpload } from "@/catalog/useImageUpload";
import { useErrorMessage } from "@/lib/useErrorMessage";
import {
  useBannersQuery,
  useReplaceBannersMutation,
  useUpdateSettingsMutation,
  type Banner,
  type BannerIn,
  type StoreSetup,
} from "./setupApi";

const MAX = 5;

type Target = { kind: "product" | "category"; id: number; label: string };

const toIn = (b: Banner): BannerIn => ({
  mediaId: b.image?.id ?? 0,
  productId: b.productId,
  categoryId: b.categoryId,
  isActive: b.isActive,
});

function LinkDialog({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (target: Target | null) => void;
}) {
  const t = useTranslations("setup.banners");
  const [text, setText] = useState("");
  const categories = useCategoriesQuery();
  const products = useProductsQuery({
    page: 1,
    itemsPerPage: 20,
    search: text.trim() || undefined,
  });
  const options: Target[] = [
    ...(categories.data ?? [])
      .filter((c) => c.archivedAt === null)
      .map((c) => ({ kind: "category" as const, id: c.id, label: c.name })),
    ...(products.data?.results ?? []).map((p) => ({
      kind: "product" as const,
      id: p.id,
      label: p.name,
    })),
  ];
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t("linkTitle")}</DialogTitle>
      <DialogContent>
        <Autocomplete
          sx={{ pt: 1 }}
          options={options}
          groupBy={(o) => t(o.kind === "product" ? "products" : "categories")}
          getOptionLabel={(o) => o.label}
          isOptionEqualToValue={(a, b) => a.kind === b.kind && a.id === b.id}
          filterOptions={(all) => all}
          inputValue={text}
          onInputChange={(_event, value) => setText(value)}
          onChange={(_event, target) => target && onPick(target)}
          noOptionsText={t("noMatches")}
          renderInput={(params) => (
            <TextField {...params} autoFocus label={t("linkSearch")} />
          )}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onPick(null)}>{t("noLink")}</Button>
        <Button onClick={onClose}>{t("cancel")}</Button>
      </DialogActions>
    </Dialog>
  );
}

/** The banner carousel of the storefront home: up to five images. */
export function BannersPanel({
  setup,
  canEdit,
}: {
  setup: StoreSetup;
  canEdit: boolean;
}) {
  const t = useTranslations("setup.banners");
  const photo = useTranslations("catalog.photo");
  const errorMessage = useErrorMessage();
  const input = useRef<HTMLInputElement>(null);
  const banners = useBannersQuery();
  const [replace, replacing] = useReplaceBannersMutation();
  const [saveSettings, savingSettings] = useUpdateSettingsMutation();
  const upload = useImageUpload();
  const [uploading, setUploading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [linking, setLinking] = useState<number | null>(null);
  const list = banners.data ?? [];
  const busy = uploading || replacing.isLoading;
  const error = (banners.error ?? replacing.error) as ApiError | undefined;

  const save = async (next: BannerIn[]) => {
    setProblem(null);
    await replace(next);
  };
  const change = (index: number, patch: Partial<BannerIn>) =>
    save(
      list.map((b, i) => (i === index ? { ...toIn(b), ...patch } : toIn(b))),
    );
  const move = (index: number, by: -1 | 1) => {
    const next = list.map(toIn);
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item!);
    return save(next);
  };
  const linkLabel = (b: Banner) =>
    b.productName
      ? t("opensProduct", { name: b.productName })
      : b.categoryName
        ? t("opensCategory", { name: b.categoryName })
        : t("opensNothing");

  const add = async (file: File) => {
    setProblem(null);
    setUploading(true);
    try {
      const result = await upload(file);
      if ("mediaId" in result) {
        await save([
          ...list.map(toIn),
          { mediaId: result.mediaId, isActive: true },
        ]);
      } else if ("problem" in result) {
        setProblem(photo(result.problem));
      } else {
        setProblem(errorMessage(result.error));
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h6" component="h2">
          {t("title")}
        </Typography>
        <Typography color="text.secondary">
          {t("help", { max: MAX })}
        </Typography>
        {error && <Alert severity="error">{errorMessage(error)}</Alert>}
        {problem && <Alert severity="error">{problem}</Alert>}
        {banners.isLoading && <CircularProgress aria-label={t("loading")} />}
        {list.map((b, index) => (
          <Stack
            key={b.id}
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{
              alignItems: { sm: "center" },
              p: 1.5,
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              opacity: b.isActive ? 1 : 0.6,
            }}
          >
            <Box
              component="img"
              src={b.image?.thumbUrl ?? b.image?.largeUrl ?? undefined}
              alt={t("imageAlt", { n: index + 1 })}
              sx={{
                width: { xs: "100%", sm: 200 },
                aspectRatio: "2 / 1",
                objectFit: "cover",
                borderRadius: 1,
                bgcolor: "action.hover",
              }}
            />
            <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600 }}>
                {t("banner", { n: index + 1 })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {linkLabel(b)}
              </Typography>
              {canEdit && (
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  <Button
                    size="small"
                    disabled={busy}
                    onClick={() => setLinking(index)}
                  >
                    {t("changeLink")}
                  </Button>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={b.isActive}
                        disabled={busy}
                        onChange={(event) =>
                          change(index, { isActive: event.target.checked })
                        }
                      />
                    }
                    label={t("active")}
                  />
                </Stack>
              )}
            </Stack>
            {canEdit && (
              <Stack direction="row">
                <IconButton
                  aria-label={t("moveUp", { n: index + 1 })}
                  disabled={busy || index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
                <IconButton
                  aria-label={t("moveDown", { n: index + 1 })}
                  disabled={busy || index === list.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
                <IconButton
                  aria-label={t("remove", { n: index + 1 })}
                  disabled={busy}
                  onClick={() =>
                    save(list.filter((_, i) => i !== index).map(toIn))
                  }
                >
                  <DeleteOutlined fontSize="small" />
                </IconButton>
              </Stack>
            )}
          </Stack>
        ))}
        {banners.data && list.length === 0 && (
          <Typography color="text.secondary">{t("none")}</Typography>
        )}
        {canEdit && (
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Button
              variant="outlined"
              startIcon={<AddPhotoAlternateOutlined />}
              disabled={busy || list.length >= MAX}
              onClick={() => input.current?.click()}
            >
              {t("add")}
            </Button>
            {list.length >= MAX && (
              <Typography variant="caption" color="text.secondary">
                {t("full", { max: MAX })}
              </Typography>
            )}
            {busy && <CircularProgress size={24} aria-label={t("saving")} />}
          </Stack>
        )}
        <input
          ref={input}
          type="file"
          hidden
          accept={PHOTO_TYPES.join(",")}
          aria-label={t("input")}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void add(file);
          }}
        />
        <Typography variant="caption" color="text.secondary">
          {t("size")}
        </Typography>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={setup.settings.bannerAutoplay}
                disabled={!canEdit || savingSettings.isLoading}
                onChange={(event) =>
                  saveSettings({ bannerAutoplay: event.target.checked })
                }
              />
            }
            label={t("autoplay")}
            sx={{ display: "flex" }}
          />
          <Typography variant="caption" color="text.secondary">
            {t("autoplayHelp")}
          </Typography>
        </Box>
      </Stack>
      {linking !== null && (
        <LinkDialog
          onClose={() => setLinking(null)}
          onPick={(target) => {
            const index = linking;
            setLinking(null);
            void change(index, {
              productId: target?.kind === "product" ? target.id : null,
              categoryId: target?.kind === "category" ? target.id : null,
            });
          }}
        />
      )}
    </Paper>
  );
}
