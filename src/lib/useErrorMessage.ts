"use client";

import { useTranslations } from "next-intl";
import type { ApiError } from "@/api/apiError";

/** Turns an API error code into Spanish text from the message catalog.
 * Codes without a translation fall back to a generic message; the raw
 * `message` is never shown to users. */
export function useErrorMessage() {
  const t = useTranslations();
  return (error: Pick<ApiError, "code">): string => {
    const key = `errors.${error.code}`;
    return t.has(key) ? t(key) : t("errors.unknown");
  };
}
