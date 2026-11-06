"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toApiError, type ApiError } from "@/api/apiError";
import { http } from "@/api/http";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { useCreateExportMutation, type ExportJob } from "./catalogApi";

const POLL_MS = 2000;
const MAX_POLLS = 150;
const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

export function ExportSection() {
  const t = useTranslations("catalog.exportSection");
  const errorMessage = useErrorMessage();
  const [start, starting] = useCreateExportMutation();
  const [data, setData] = useState<ExportJob | null>(null);
  const [readFailure, setReadFailure] = useState<ApiError | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const failure = (starting.error ?? readFailure) as ApiError | null;
  const waiting = starting.isLoading || data?.status === "queued";

  const run = async () => {
    setReadFailure(null);
    const result = await start();
    if (!("data" in result) || !result.data) return;
    setData(result.data);
    let job = result.data;
    for (let i = 0; i < MAX_POLLS && alive.current; i += 1) {
      if (job.status !== "queued") return;
      await wait(POLL_MS);
      try {
        job = (await http.get<ExportJob>(`/export-jobs/${job.id}`)).data;
      } catch (error) {
        if (alive.current) setReadFailure(toApiError(error));
        return;
      }
      if (alive.current) setData(job);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3 }} component="section">
      <Stack spacing={2}>
        <Typography variant="h6" component="h2">
          {t("title")}
        </Typography>
        <Typography color="text.secondary">{t("help")}</Typography>
        {failure && <Alert severity="error">{errorMessage(failure)}</Alert>}
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Button variant="outlined" disabled={waiting} onClick={run}>
            {t("start")}
          </Button>
          {waiting && <CircularProgress size={24} aria-label={t("working")} />}
        </Stack>
        {data?.status === "ready" && data.downloadUrl && (
          <Alert severity="success">
            {t("ready", { count: data.rowCount ?? 0 })}{" "}
            <a href={data.downloadUrl} download>
              {t("download")}
            </a>
          </Alert>
        )}
        {data?.status === "failed" && (
          <Alert severity="error">{t("failed")}</Alert>
        )}
        {data?.status === "expired" && (
          <Alert severity="warning">{t("expired")}</Alert>
        )}
      </Stack>
    </Paper>
  );
}
