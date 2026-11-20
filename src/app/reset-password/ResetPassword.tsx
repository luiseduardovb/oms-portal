"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ApiError } from "@/api/apiError";
import { useConfirmPasswordResetMutation } from "@/auth/authApi";
import { useErrorMessage } from "@/lib/useErrorMessage";

const MIN_PASSWORD = 10;

export function ResetPassword() {
  const t = useTranslations("reset");
  const errorMessage = useErrorMessage();
  const token = useSearchParams().get("token") ?? "";
  const [confirm, { isLoading, isSuccess, error }] =
    useConfirmPasswordResetMutation();

  const schema = z
    .object({
      password: z.string().min(MIN_PASSWORD, t("passwordShort")),
      again: z.string(),
    })
    .refine((v) => v.password === v.again, {
      path: ["again"],
      message: t("passwordsDiffer"),
    });
  type Values = z.infer<typeof schema>;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  if (token === "") {
    return (
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">
          {t("invalidTitle")}
        </Typography>
        <Alert severity="error">
          {errorMessage({ code: "auth.invalid_reset" } as ApiError)}
        </Alert>
        <Button component={Link} href="/forgot-password" variant="contained">
          {t("askAgain")}
        </Button>
      </Stack>
    );
  }

  if (isSuccess) {
    return (
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">
          {t("doneTitle")}
        </Typography>
        <Alert severity="success">{t("done")}</Alert>
        <Button component={Link} href="/login" variant="contained" size="large">
          {t("signIn")}
        </Button>
      </Stack>
    );
  }

  const code = (error as ApiError | undefined)?.code;
  return (
    <Stack
      component="form"
      spacing={3}
      noValidate
      onSubmit={handleSubmit(async (values) => {
        await confirm({ token, password: values.password });
      })}
    >
      <Stack spacing={1}>
        <Typography variant="h4" component="h1">
          {t("title")}
        </Typography>
        <Typography color="text.secondary">
          {t("subtitle", { count: MIN_PASSWORD })}
        </Typography>
      </Stack>
      {error && (
        <Alert severity="error">{errorMessage(error as ApiError)}</Alert>
      )}
      <TextField
        label={t("password")}
        type="password"
        autoComplete="new-password"
        autoFocus
        error={Boolean(errors.password)}
        helperText={errors.password?.message}
        {...register("password")}
      />
      <TextField
        label={t("again")}
        type="password"
        autoComplete="new-password"
        error={Boolean(errors.again)}
        helperText={errors.again?.message}
        {...register("again")}
      />
      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={isLoading}
      >
        {isLoading ? t("submitting") : t("submit")}
      </Button>
      {code === "auth.invalid_reset" && (
        <Button component={Link} href="/forgot-password">
          {t("askAgain")}
        </Button>
      )}
    </Stack>
  );
}
