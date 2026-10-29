import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it } from "vitest";
import { http } from "@/api/http";
import { ApiStatus } from "@/components/ApiStatus";
import { renderWithProviders } from "./render";

const originalAdapter = http.defaults.adapter;

afterEach(() => {
  http.defaults.adapter = originalAdapter;
});

function respondWith(status: number, data: unknown) {
  http.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const response = { status, data, statusText: "", headers: {}, config };
    if (status >= 400) {
      throw new AxiosError("failed", undefined, config, undefined, response);
    }
    return response;
  };
}

describe("ApiStatus", () => {
  it("shows a Spanish success message when the API is healthy", async () => {
    respondWith(200, { status: "ok" });
    renderWithProviders(<ApiStatus />);
    expect(
      await screen.findByText("El servicio está disponible"),
    ).toBeInTheDocument();
  });

  it("shows a Spanish error and retries when the API is down", async () => {
    respondWith(503, {
      detail: { code: "server.error", message: "x", ctx: {} },
    });
    renderWithProviders(<ApiStatus />);
    expect(
      await screen.findByText("No pudimos conectar con el servicio"),
    ).toBeInTheDocument();

    respondWith(200, { status: "ok" });
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(
      await screen.findByText(
        "El servicio está disponible",
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
  });
});
