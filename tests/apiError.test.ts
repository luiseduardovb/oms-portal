import { AxiosError, type AxiosResponse } from "axios";
import { describe, expect, it } from "vitest";
import {
  NETWORK_ERROR_CODE,
  UNKNOWN_ERROR_CODE,
  toApiError,
} from "@/api/apiError";

function axiosFailure(status: number, data: unknown): AxiosError {
  const response = { status, data } as AxiosResponse;
  return new AxiosError("failed", undefined, undefined, undefined, response);
}

describe("toApiError", () => {
  it("reads the API's coded envelope", () => {
    const error = toApiError(
      axiosFailure(409, {
        detail: {
          code: "order.invalid_transition",
          message: "Nope.",
          ctx: { a: 1 },
        },
      }),
    );
    expect(error).toEqual({
      status: 409,
      code: "order.invalid_transition",
      message: "Nope.",
      ctx: { a: 1 },
    });
  });

  it("falls back to an unknown code when the body is not the envelope", () => {
    const error = toApiError(axiosFailure(502, "<html>Bad gateway</html>"));
    expect(error.code).toBe(UNKNOWN_ERROR_CODE);
    expect(error.status).toBe(502);
  });

  it("reports a network error when there was no response", () => {
    const error = toApiError(new AxiosError("Network Error"));
    expect(error.code).toBe(NETWORK_ERROR_CODE);
    expect(error.status).toBeNull();
  });

  it("handles errors that are not from axios", () => {
    expect(toApiError(new Error("boom")).code).toBe(UNKNOWN_ERROR_CODE);
    expect(toApiError("text").code).toBe(UNKNOWN_ERROR_CODE);
  });
});
