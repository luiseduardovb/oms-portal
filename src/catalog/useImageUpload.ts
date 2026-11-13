"use client";

import axios, { isAxiosError } from "axios";
import { useCallback } from "react";
import { toApiError, type ApiError } from "@/api/apiError";
import { http } from "@/api/http";
import {
  useCompleteUploadMutation,
  useCreateUploadMutation,
  type Media,
} from "./catalogApi";

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const POLLS = 20;

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** Why an upload did not finish: a message key, or the API's own error. */
export type UploadResult =
  | { mediaId: number }
  | { problem: "badType" | "tooBig" | "uploadFailed" | "failed" | "slow" }
  | { error: ApiError };

/**
 * Sends one image straight to storage and waits until it is processed.
 * The caller shows the problem and attaches the image.
 */
export function useImageUpload(): (file: File) => Promise<UploadResult> {
  const [createUpload] = useCreateUploadMutation();
  const [completeUpload] = useCompleteUploadMutation();
  return useCallback(
    async (file) => {
      if (!PHOTO_TYPES.includes(file.type)) return { problem: "badType" };
      if (file.size > PHOTO_MAX_BYTES) return { problem: "tooBig" };
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
          return { problem: "uploadFailed" };
        }
        let media: Media = await completeUpload(created.id).unwrap();
        for (let i = 0; i < POLLS && media.status === "pending"; i += 1) {
          await wait(1000);
          media = (await http.get<Media>(`/media/${created.id}`)).data;
        }
        if (media.status === "ready") return { mediaId: created.id };
        return { problem: media.status === "failed" ? "failed" : "slow" };
      } catch (error) {
        // RTK Query's unwrap() throws the API error object itself.
        return {
          error: isAxiosError(error) ? toApiError(error) : (error as ApiError),
        };
      }
    },
    [createUpload, completeUpload],
  );
}
