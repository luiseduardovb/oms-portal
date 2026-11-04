"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ApiError } from "@/api/apiError";
import { useErrorMessage } from "@/lib/useErrorMessage";
import {
  useChangeSlugMutation,
  useRenameStoreMutation,
  type StoreSetup,
} from "./setupApi";

interface Props {
  setup: StoreSetup;
  canEdit: boolean;
  isOwner: boolean;
}

export function StoreTab({ setup, canEdit, isOwner }: Props) {
  return (
    <Stack spacing={3}>
      <NameSection setup={setup} canEdit={canEdit} />
      <AddressSection setup={setup} isOwner={isOwner} />
      <RegionSection setup={setup} />
    </Stack>
  );
}

function NameSection({
  setup,
  canEdit,
}: {
  setup: StoreSetup;
  canEdit: boolean;
}) {
  const t = useTranslations("setup");
  const errorMessage = useErrorMessage();
  const [rename, { isLoading, error, isSuccess, reset }] =
    useRenameStoreMutation();
  const schema = z.object({
    name: z.string().trim().min(1, t("store.nameRequired")).max(120),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: { name: setup.name },
  });

  return (
    <Paper
      variant="outlined"
      component="form"
      noValidate
      sx={{ p: 3 }}
      onSubmit={handleSubmit(async ({ name }) => {
        reset();
        await rename(name);
      })}
    >
      <Stack spacing={2}>
        <Typography variant="h6" component="h2">
          {t("store.nameSection")}
        </Typography>
        {error && (
          <Alert severity="error">{errorMessage(error as ApiError)}</Alert>
        )}
        {isSuccess && <Alert severity="success">{t("saved")}</Alert>}
        <TextField
          label={t("store.name")}
          disabled={!canEdit}
          error={Boolean(errors.name)}
          helperText={errors.name?.message}
          {...register("name")}
        />
        {canEdit && (
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            sx={{ alignSelf: "flex-start" }}
          >
            {isLoading ? t("saving") : t("save")}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}

function AddressSection({
  setup,
  isOwner,
}: {
  setup: StoreSetup;
  isOwner: boolean;
}) {
  const t = useTranslations("setup");
  const errorMessage = useErrorMessage();
  const [change, { isLoading, error, isSuccess, reset }] =
    useChangeSlugMutation();
  const [pending, setPending] = useState<string | null>(null);
  const schema = z.object({
    slug: z.string().trim().min(1, t("store.slugRequired")),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: { slug: setup.slug },
  });

  const confirm = async () => {
    if (pending === null) return;
    const slug = pending;
    setPending(null);
    reset();
    await change(slug);
  };

  return (
    <Paper
      variant="outlined"
      component="form"
      noValidate
      sx={{ p: 3 }}
      onSubmit={handleSubmit(({ slug }) => {
        // Unchanged is nothing to confirm.
        if (slug.trim().toLowerCase() !== setup.slug) setPending(slug);
      })}
    >
      <Stack spacing={2}>
        <Typography variant="h6" component="h2">
          {t("store.addressSection")}
        </Typography>
        <Typography color="text.secondary">{t("store.addressHelp")}</Typography>
        {error && (
          <Alert severity="error">{errorMessage(error as ApiError)}</Alert>
        )}
        {isSuccess && <Alert severity="success">{t("saved")}</Alert>}
        <TextField
          label={t("store.slug")}
          disabled={!isOwner}
          error={Boolean(errors.slug)}
          helperText={errors.slug?.message}
          {...register("slug")}
        />
        {isOwner && (
          <Button
            type="submit"
            variant="outlined"
            disabled={isLoading}
            sx={{ alignSelf: "flex-start" }}
          >
            {t("store.changeSlug")}
          </Button>
        )}
      </Stack>
      <Dialog open={pending !== null} onClose={() => setPending(null)}>
        <DialogTitle>{t("store.confirmTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t("store.confirmText")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPending(null)}>{t("store.cancel")}</Button>
          <Button variant="contained" onClick={confirm}>
            {t("store.confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

function RegionSection({ setup }: { setup: StoreSetup }) {
  const t = useTranslations("setup.store");
  const format = useFormatter();
  const { country, tax } = setup;
  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={1}>
        <Typography variant="h6" component="h2">
          {t("regionSection")}
        </Typography>
        <Typography>
          {t("country")}: {country.name}
        </Typography>
        <Typography>
          {t("timezone")}: {setup.timezone}
        </Typography>
        <Typography>
          {t("currency")}: {country.currencyCode}
        </Typography>
        <Typography variant="h6" component="h2" sx={{ pt: 2 }}>
          {t("taxSection")}
        </Typography>
        <Typography>
          {tax
            ? t("taxText", {
                label: tax.label,
                rate: tax.ratePercent,
                date: format.dateTime(new Date(tax.effectiveFrom), {
                  dateStyle: "medium",
                }),
              })
            : t("taxNone")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("taxNote")}
        </Typography>
      </Stack>
    </Paper>
  );
}
