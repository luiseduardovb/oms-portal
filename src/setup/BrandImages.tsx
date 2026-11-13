"use client";

import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import type { ApiError } from "@/api/apiError";
import { PhotoUpload } from "@/catalog/PhotoUpload";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { useUpdateSettingsMutation, type StoreSetup } from "./setupApi";

/** The store's logo and cover picture. */
export function BrandImages({
  setup,
  canEdit,
}: {
  setup: StoreSetup;
  canEdit: boolean;
}) {
  const t = useTranslations("setup.images");
  const errorMessage = useErrorMessage();
  const [save, saving] = useUpdateSettingsMutation();
  const error = saving.error as ApiError | undefined;
  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h6" component="h2">
          {t("title")}
        </Typography>
        <Typography color="text.secondary">{t("help")}</Typography>
        {error && <Alert severity="error">{errorMessage(error)}</Alert>}
        <PhotoUpload
          title={t("logo")}
          alt={t("logoAlt")}
          thumbUrl={setup.logo?.thumbUrl ?? null}
          disabled={!canEdit}
          onReady={(id) => save({ logoMediaId: id }).unwrap()}
          onRemove={() => save({ logoMediaId: null }).unwrap()}
        />
        <PhotoUpload
          title={t("cover")}
          alt={t("coverAlt")}
          width={192}
          height={96}
          thumbUrl={setup.cover?.thumbUrl ?? null}
          disabled={!canEdit}
          onReady={(id) => save({ coverMediaId: id }).unwrap()}
          onRemove={() => save({ coverMediaId: null }).unwrap()}
        />
        <Typography variant="caption" color="text.secondary">
          {t("coverHelp")}
        </Typography>
      </Stack>
    </Paper>
  );
}
