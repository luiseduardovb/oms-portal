"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ApiError } from "@/api/apiError";
import { useRequestPasswordResetMutation } from "@/auth/authApi";
import { useErrorMessage } from "@/lib/useErrorMessage";

export function ForgotPassword() {
  const t = useTranslations("forgot");
  const errorMessage = useErrorMessage();
  const [request, { isLoading, isSuccess, error }] =
    useRequestPasswordResetMutation();

  const schema = z.object({
    email: z
      .string()
      .min(1, t("emailRequired"))
      .pipe(z.email(t("emailInvalid"))),
  });
  type Values = z.infer<typeof schema>;
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  if (isSuccess) {
    return (
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">
          {t("sentTitle")}
        </Typography>
        <Alert severity="success">
          {t("sent", { email: getValues("email") })}
        </Alert>
        <Button component={Link} href="/login" variant="outlined">
          {t("back")}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack
      component="form"
      spacing={3}
      noValidate
      onSubmit={handleSubmit(async (values) => {
        await request({ email: values.email.trim() });
      })}
    >
      <Stack spacing={1}>
        <Typography variant="h4" component="h1">
          {t("title")}
        </Typography>
        <Typography color="text.secondary">{t("subtitle")}</Typography>
      </Stack>
      {error && (
        <Alert severity="error">{errorMessage(error as ApiError)}</Alert>
      )}
      <TextField
        label={t("email")}
        type="email"
        autoComplete="username"
        autoFocus
        error={Boolean(errors.email)}
        helperText={errors.email?.message}
        {...register("email")}
      />
      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={isLoading}
      >
        {isLoading ? t("submitting") : t("submit")}
      </Button>
      <Button component={Link} href="/login">
        {t("back")}
      </Button>
    </Stack>
  );
}
