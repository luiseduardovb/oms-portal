"use client";

import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import axios, { isAxiosError } from "axios";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toApiError, type ApiError } from "@/api/apiError";
import { http } from "@/api/http";
import { useErrorMessage } from "@/lib/useErrorMessage";
import {
  useCompleteUploadMutation,
  useCreateUploadMutation,
  type Media,
} from "./catalogApi";

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const POLLS = 20;

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

interface Props {
  thumbUrl: string | null;
  disabled: boolean;
  /** Called with the new media id once the image is processed. */
  onReady: (mediaId: number) => Promise<unknown>;
  onRemove: () => Promise<unknown>;
}

/** Pick a file, send it straight to storage, wait until it is processed. */
export function PhotoUpload({ thumbUrl, disabled, onReady, onRemove }: Props) {
  const t = useTranslations("catalog.photo");
  const errorMessage = useErrorMessage();
  const input = useRef<HTMLInputElement>(null);
  const [createUpload] = useCreateUploadMutation();
  const [completeUpload] = useCompleteUploadMutation();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const pick = async (file: File) => {
    setProblem(null);
    if (!PHOTO_TYPES.includes(file.type)) {
      setProblem(t("badType"));
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setProblem(t("tooBig"));
      return;
    }
    setBusy(true);
    try {
      const created = await createUpload({
        contentType: file.type,
        sizeBytes: file.size,
      }).unwrap();
      const { url, method, headers } = created.upload;
      // The storage address is not our API: no session headers go there.
      try {
        await axios.request({ url, method, headers, data: file });
      } catch {
        setProblem(t("uploadFailed"));
        return;
      }
      let media: Media = await completeUpload(created.id).unwrap();
      for (let i = 0; i < POLLS && media.status === "pending"; i += 1) {
        await wait(1000);
        media = (await http.get<Media>(`/media/${created.id}`)).data;
      }
      if (media.status === "ready") {
        await onReady(created.id);
      } else if (media.status === "failed") {
        setProblem(t("failed"));
      } else {
        setProblem(t("slow"));
      }
    } catch (error) {
      // RTK Query's unwrap() throws the API error object itself.
      setProblem(
        errorMessage(
          isAxiosError(error) ? toApiError(error) : (error as ApiError),
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{t("title")}</Typography>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Avatar
          variant="rounded"
          src={thumbUrl ?? undefined}
          alt={thumbUrl ? t("alt") : ""}
          sx={{ width: 96, height: 96 }}
        >
          {thumbUrl ? null : t("none")}
        </Avatar>
        {!disabled && (
          <Stack spacing={1}>
            <Button
              variant="outlined"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              {thumbUrl ? t("replace") : t("choose")}
            </Button>
            {thumbUrl && (
              <Button color="error" disabled={busy} onClick={() => onRemove()}>
                {t("remove")}
              </Button>
            )}
          </Stack>
        )}
        {busy && <CircularProgress size={24} aria-label={t("uploading")} />}
      </Stack>
      <input
        ref={input}
        type="file"
        hidden
        accept={PHOTO_TYPES.join(",")}
        aria-label={t("input")}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void pick(file);
        }}
      />
      <Typography variant="caption" color="text.secondary">
        {t("help")}
      </Typography>
      {problem && <Alert severity="error">{problem}</Alert>}
    </Stack>
  );
}
