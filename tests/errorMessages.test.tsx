import { renderHook } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import messages from "../messages/es.json";
import { useErrorMessage } from "@/lib/useErrorMessage";

function wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="es" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

describe("useErrorMessage", () => {
  it("returns Spanish text for known API codes", () => {
    const { result } = renderHook(() => useErrorMessage(), { wrapper });
    expect(result.current({ code: "auth.forbidden" })).toBe(
      "No tienes permiso para hacer esto.",
    );
    expect(result.current({ code: "common.not_found" })).toBe(
      "No encontramos lo que buscas.",
    );
  });

  it("falls back to a generic message for unknown codes", () => {
    const { result } = renderHook(() => useErrorMessage(), { wrapper });
    expect(result.current({ code: "order.something_new" })).toBe(
      messages.errors.unknown,
    );
  });
});
