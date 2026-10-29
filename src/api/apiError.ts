import { isAxiosError } from "axios";

/** The API's error envelope: {"detail": {"code", "message", "ctx"}}. */
export interface ApiError {
  status: number | null;
  /** Stable machine code such as "order.invalid_transition". */
  code: string;
  /** For developers and logs only; the UI shows text chosen from `code`. */
  message: string;
  ctx: Record<string, unknown>;
}

export const NETWORK_ERROR_CODE = "client.network_error";
export const UNKNOWN_ERROR_CODE = "client.unknown_error";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function toApiError(error: unknown): ApiError {
  if (!isAxiosError(error)) {
    return {
      status: null,
      code: UNKNOWN_ERROR_CODE,
      message: error instanceof Error ? error.message : "Unknown error",
      ctx: {},
    };
  }
  const status = error.response?.status ?? null;
  if (status === null) {
    return {
      status,
      code: NETWORK_ERROR_CODE,
      message: error.message,
      ctx: {},
    };
  }
  const data: unknown = error.response?.data;
  const detail = isRecord(data) ? data.detail : undefined;
  if (
    isRecord(detail) &&
    typeof detail.code === "string" &&
    typeof detail.message === "string"
  ) {
    return {
      status,
      code: detail.code,
      message: detail.message,
      ctx: isRecord(detail.ctx) ? detail.ctx : {},
    };
  }
  return { status, code: UNKNOWN_ERROR_CODE, message: error.message, ctx: {} };
}
