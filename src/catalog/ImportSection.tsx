"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import axios, { isAxiosError } from "axios";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toApiError, type ApiError } from "@/api/apiError";
import { http } from "@/api/http";
import { useErrorMessage } from "@/lib/useErrorMessage";
import {
  useApplyImportMutation,
  useCompleteImportMutation,
  useCreateImportMutation,
  type ImportJob,
} from "./catalogApi";

export const CSV_MAX_BYTES = 5 * 1024 * 1024;
export const POLL_MS = 2000;
const MAX_POLLS = 300;
const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));
const WORKING = ["pending", "validating", "applying"];

export function ImportSection() {
  const t = useTranslations("catalog.importSection");
  const errorMessage = useErrorMessage();
  const input = useRef<HTMLInputElement>(null);
  const [createImport] = useCreateImportMutation();
  const [completeImport] = useCompleteImportMutation();
  const [applyImport, applying] = useApplyImportMutation();
  const [data, setData] = useState<ImportJob | null>(null);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /** Read the job until it stops working (the check and the save run in the
   * background). */
  const follow = async (id: number) => {
    for (let i = 0; i < MAX_POLLS && alive.current; i += 1) {
      const job = (await http.get<ImportJob>(`/import-jobs/${id}`)).data;
      if (!alive.current) return;
      setData(job);
      if (!WORKING.includes(job.status)) return;
      await wait(POLL_MS);
    }
  };

  const pick = async (file: File) => {
    setProblem(null);
    setData(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setProblem(t("notCsv"));
      return;
    }
    if (file.size === 0 || file.size > CSV_MAX_BYTES) {
      setProblem(file.size === 0 ? t("empty") : t("tooBig"));
      return;
    }
    setSending(true);
    try {
      const created = await createImport({ sizeBytes: file.size }).unwrap();
      const { url, method, headers } = created.upload;
      try {
        await axios.request({ url, method, headers, data: file });
      } catch {
        setProblem(t("uploadFailed"));
        return;
      }
      setData(await completeImport(created.id).unwrap());
      await follow(created.id);
    } catch (error) {
      setProblem(
        errorMessage(
          isAxiosError(error) ? toApiError(error) : (error as ApiError),
        ),
      );
    } finally {
      setSending(false);
    }
  };

  const working = data !== null && WORKING.includes(data.status);
  const failure = applying.error as ApiError | undefined;

  return (
    <Paper variant="outlined" sx={{ p: 3 }} component="section">
      <Stack spacing={2}>
        <Typography variant="h6" component="h2">
          {t("title")}
        </Typography>
        <Typography color="text.secondary">{t("help")}</Typography>
        <Typography variant="caption" color="text.secondary">
          {t("columns")}
        </Typography>
        {problem && <Alert severity="error">{problem}</Alert>}
        {failure && <Alert severity="error">{errorMessage(failure)}</Alert>}
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Button
            variant="outlined"
            disabled={sending || working}
            onClick={() => input.current?.click()}
          >
            {t("choose")}
          </Button>
          {(sending || working) && (
            <CircularProgress size={24} aria-label={t("working")} />
          )}
        </Stack>
        <input
          ref={input}
          type="file"
          hidden
          accept=".csv,text/csv"
          aria-label={t("input")}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void pick(file);
          }}
        />
        {data && (
          <Stack spacing={2} role="status">
            {working && (
              <Typography>
                {data.status === "applying" ? t("applying") : t("checking")}
              </Typography>
            )}
            {data.status === "validated" && (
              <>
                <Alert severity="success">
                  {t("validated", { count: data.rowCount ?? 0 })}
                </Alert>
                <Summary summary={data.summary} />
                <div>
                  <Button
                    variant="contained"
                    disabled={applying.isLoading}
                    onClick={async () => {
                      const result = await applyImport(data.id);
                      if ("data" in result && result.data) {
                        setData(result.data);
                        await follow(data.id);
                      }
                    }}
                  >
                    {t("apply")}
                  </Button>
                </div>
              </>
            )}
            {data.status === "invalid" && (
              <>
                <Alert severity="error">
                  {t("invalid", { count: data.errorCount })}
                </Alert>
                <Report job={data} />
              </>
            )}
            {data.status === "applied" && (
              <>
                <Alert severity="success">{t("applied")}</Alert>
                <Summary summary={data.summary} />
              </>
            )}
            {data.status === "failed" && (
              <Alert severity="error">
                {errorMessage({ code: data.failureReason ?? "" })}
              </Alert>
            )}
            {data.status === "expired" && (
              <Alert severity="warning">{t("expired")}</Alert>
            )}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

function Summary({
  summary,
}: {
  summary: Record<string, number> | null | undefined;
}) {
  const t = useTranslations("catalog.importSection.summary");
  const keys = [
    "created",
    "updated",
    "unchanged",
    "archived",
    "restored",
    "categoriesCreated",
  ];
  if (!summary) return null;
  return (
    <Table size="small" aria-label={t("table")} sx={{ maxWidth: 360 }}>
      <TableBody>
        {keys
          .filter((key) => key in summary)
          .map((key) => (
            <TableRow key={key}>
              <TableCell>{t(key)}</TableCell>
              <TableCell align="right">{summary[key]}</TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}

function Report({
  job,
}: {
  job: {
    errors: { row: number | null; column: string | null; code: string }[];
    errorCount: number;
  };
}) {
  const t = useTranslations("catalog.importSection.report");
  const errorMessage = useErrorMessage();
  return (
    <>
      <Table size="small" aria-label={t("table")}>
        <TableHead>
          <TableRow>
            <TableCell>{t("row")}</TableCell>
            <TableCell>{t("column")}</TableCell>
            <TableCell>{t("problem")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {job.errors.map((issue, index) => (
            <TableRow key={index}>
              <TableCell>{issue.row ?? "—"}</TableCell>
              <TableCell>{issue.column ?? "—"}</TableCell>
              <TableCell>{errorMessage(issue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {job.errorCount > job.errors.length && (
        <Typography variant="caption" color="text.secondary">
          {t("more", { shown: job.errors.length, total: job.errorCount })}
        </Typography>
      )}
    </>
  );
}
