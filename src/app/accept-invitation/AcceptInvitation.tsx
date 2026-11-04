"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ApiError } from "@/api/apiError";
import { useErrorMessage } from "@/lib/useErrorMessage";
import {
  useAcceptInvitationMutation,
  usePreviewInvitationQuery,
  type InvitationPreview,
} from "@/team/teamApi";

const MIN_PASSWORD = 10;

export function AcceptInvitation() {
  const t = useTranslations("accept");
  const errorMessage = useErrorMessage();
  const token = useSearchParams().get("token") ?? "";
  const preview = usePreviewInvitationQuery(token, { skip: token === "" });

  if (token === "" || preview.error) {
    const error = preview.error as ApiError | undefined;
    return (
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">
          {t("invalidTitle")}
        </Typography>
        <Alert severity="error">
          {token === ""
            ? errorMessage({ code: "team.invitation_invalid" })
            : errorMessage(error ?? { code: "team.invitation_invalid" })}
        </Alert>
        <Button component={Link} href="/login">
          {t("goToLogin")}
        </Button>
      </Stack>
    );
  }
  if (!preview.data) {
    return <CircularProgress aria-label={t("loading")} />;
  }
  return <AcceptForm token={token} preview={preview.data} />;
}

function AcceptForm({
  token,
  preview,
}: {
  token: string;
  preview: InvitationPreview;
}) {
  const t = useTranslations("accept");
  const errorMessage = useErrorMessage();
  const [accept, { isLoading, error, data: accepted }] =
    useAcceptInvitationMutation();

  // An existing user proves the account with their current password; a new
  // one picks a password and gives a name; owners also give their DNI.
  const schema = z.object({
    firstName: z.string(),
    lastName: z.string(),
    dni: preview.requiresDni ? z.string().min(1, t("dniRequired")) : z.string(),
    password: preview.userExists
      ? z.string().min(1, t("passwordRequired"))
      : z.string().min(MIN_PASSWORD, t("passwordTooShort")),
  });
  type Values = z.infer<typeof schema>;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: "", lastName: "", dni: "", password: "" },
  });

  if (accepted) {
    return (
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">
          {t("doneTitle")}
        </Typography>
        <Alert severity="success">
          {t("doneBody", { merchant: accepted.merchantName })}
        </Alert>
        <Button component={Link} href="/login" variant="contained" size="large">
          {t("goToLogin")}
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
        await accept({
          token,
          password: values.password,
          firstName: preview.userExists ? undefined : values.firstName || null,
          lastName: preview.userExists ? undefined : values.lastName || null,
          dni: preview.requiresDni ? values.dni : undefined,
        });
      })}
    >
      <Stack spacing={1}>
        <Typography variant="h4" component="h1">
          {t("title", { merchant: preview.merchantName })}
        </Typography>
        <Typography color="text.secondary">
          {t("subtitle", { role: preview.roleName })}
        </Typography>
        <Typography color="text.secondary">
          {preview.userExists ? t("existingUser") : t("newUser")}
        </Typography>
      </Stack>
      {error && (
        <Alert severity="error">{errorMessage(error as ApiError)}</Alert>
      )}
      {!preview.userExists && (
        <>
          <TextField
            label={t("firstName")}
            autoComplete="given-name"
            {...register("firstName")}
          />
          <TextField
            label={t("lastName")}
            autoComplete="family-name"
            {...register("lastName")}
          />
        </>
      )}
      {preview.requiresDni && (
        <TextField
          label={t("dni")}
          helperText={errors.dni?.message ?? t("dniHelp")}
          error={Boolean(errors.dni)}
          {...register("dni")}
        />
      )}
      <TextField
        label={preview.userExists ? t("currentPassword") : t("newPassword")}
        type="password"
        autoComplete={preview.userExists ? "current-password" : "new-password"}
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
        {t("submit")}
      </Button>
    </Stack>
  );
}
