"use client";

import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { PHOTO_TYPES, useImageUpload } from "./useImageUpload";

export { PHOTO_MAX_BYTES, PHOTO_TYPES } from "./useImageUpload";

interface Props {
  thumbUrl: string | null;
  disabled: boolean;
  /** Called with the new media id once the image is processed. */
  onReady: (mediaId: number) => Promise<unknown>;
  onRemove: () => Promise<unknown>;
  /** For other images than a product photo (the store logo, say). */
  title?: string;
  alt?: string;
  width?: number;
  height?: number;
}

/** Pick a file, send it straight to storage, wait until it is processed. */
export function PhotoUpload({
  thumbUrl,
  disabled,
  onReady,
  onRemove,
  title,
  alt,
  width = 96,
  height = 96,
}: Props) {
  const t = useTranslations("catalog.photo");
  const errorMessage = useErrorMessage();
  const input = useRef<HTMLInputElement>(null);
  const upload = useImageUpload();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const pick = async (file: File) => {
    setProblem(null);
    setBusy(true);
    try {
      const result = await upload(file);
      if ("mediaId" in result) await onReady(result.mediaId);
      else if ("problem" in result) setProblem(t(result.problem));
      else setProblem(errorMessage(result.error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{title ?? t("title")}</Typography>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Avatar
          variant="rounded"
          src={thumbUrl ?? undefined}
          alt={thumbUrl ? (alt ?? t("alt")) : ""}
          sx={{ width, height }}
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
