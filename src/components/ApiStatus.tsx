"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useGetHealthQuery } from "@/api/health";

export function ApiStatus() {
  const t = useTranslations("home");
  const { data, isLoading, isError, refetch } = useGetHealthQuery();

  return (
    <Stack spacing={1.5} aria-live="polite">
      <Typography variant="subtitle2" color="text.secondary">
        {t("apiStatus")}
      </Typography>
      {isLoading && (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <CircularProgress size={18} />
          <Typography>{t("apiChecking")}</Typography>
        </Stack>
      )}
      {data?.status === "ok" && <Alert severity="success">{t("apiOk")}</Alert>}
      {isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              {t("retry")}
            </Button>
          }
        >
          {t("apiDown")}
        </Alert>
      )}
    </Stack>
  );
}
