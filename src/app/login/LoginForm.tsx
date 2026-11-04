"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useLoginMutation } from "@/auth/authApi";
import { safeNext } from "@/auth/permissions";
import { useSessionStatus } from "@/auth/useSession";
import { useErrorMessage } from "@/lib/useErrorMessage";
import type { ApiError } from "@/api/apiError";

export function LoginForm() {
  const t = useTranslations("login");
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const status = useSessionStatus();
  const [login, { isLoading, error }] = useLoginMutation();

  const schema = z.object({
    email: z
      .string()
      .min(1, t("emailRequired"))
      .pipe(z.email(t("emailInvalid"))),
    password: z.string().min(1, t("passwordRequired")),
  });
  type Values = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  // Already signed in (or just signed in): go where the user was heading.
  useEffect(() => {
    if (status === "authenticated") router.replace(next);
  }, [status, next, router]);

  return (
    <Stack
      component="form"
      spacing={3}
      noValidate
      onSubmit={handleSubmit(async (values) => {
        await login(values);
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
      <TextField
        label={t("password")}
        type="password"
        autoComplete="current-password"
        error={Boolean(errors.password)}
        helperText={errors.password?.message}
        {...register("password")}
      />
      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={isLoading}
      >
        {isLoading ? t("submitting") : t("submit")}
      </Button>
    </Stack>
  );
}
