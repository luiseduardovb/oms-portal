import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { http } from "@/api/http";
import { ForgotPassword } from "../src/app/forgot-password/ForgotPassword";
import { ResetPassword } from "../src/app/reset-password/ResetPassword";
import { apiError, fakeApi } from "./fakeApi";
import { renderWithProviders } from "./render";

let search = "token=tok-1234567890";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => "/",
}));

beforeEach(() => {
  search = "token=tok-1234567890";
});

describe("forgot password", () => {
  it("asks for a valid email, then says to check the inbox", async () => {
    const { calls } = fakeApi(http, () => ({ status: 204 }));
    renderWithProviders(<ForgotPassword />);
    await userEvent.type(
      screen.getByLabelText("Correo electrónico"),
      "no-es-correo",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Enviar enlace" }),
    );
    expect(
      await screen.findByText("Revisa el correo ingresado."),
    ).toBeInTheDocument();
    expect(calls).toHaveLength(0);

    await userEvent.clear(screen.getByLabelText("Correo electrónico"));
    await userEvent.type(
      screen.getByLabelText("Correo electrónico"),
      "ana@example.com",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Enviar enlace" }),
    );
    expect(await screen.findByText("Revisa tu correo")).toBeInTheDocument();
    expect(screen.getByText(/ana@example.com tiene una cuenta/)).toBeVisible();
    expect(calls[0]).toMatchObject({
      method: "POST",
      url: "/auth/password-reset",
      data: { email: "ana@example.com" },
    });
  });
});

describe("reset password", () => {
  it("needs a link with a token", async () => {
    search = "";
    const { calls } = fakeApi(http, () => ({ status: 204 }));
    renderWithProviders(<ResetPassword />);
    expect(await screen.findByText("Enlace no válido")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Pedir un enlace nuevo" }),
    ).toHaveAttribute("href", "/forgot-password");
    expect(calls).toHaveLength(0);
  });

  it("checks the password before sending and then signs in again", async () => {
    const { calls } = fakeApi(http, () => ({ status: 204 }));
    renderWithProviders(<ResetPassword />);
    await userEvent.type(screen.getByLabelText("Contraseña nueva"), "corta");
    await userEvent.type(
      screen.getByLabelText("Repite la contraseña"),
      "corta",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar contraseña" }),
    );
    expect(
      await screen.findByText("Usa al menos 10 caracteres."),
    ).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Contraseña nueva"));
    await userEvent.type(
      screen.getByLabelText("Contraseña nueva"),
      "contraseña-larga",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar contraseña" }),
    );
    expect(
      await screen.findByText("Las contraseñas no coinciden."),
    ).toBeInTheDocument();
    expect(calls).toHaveLength(0);

    await userEvent.clear(screen.getByLabelText("Repite la contraseña"));
    await userEvent.type(
      screen.getByLabelText("Repite la contraseña"),
      "contraseña-larga",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar contraseña" }),
    );
    expect(
      await screen.findByText("Contraseña actualizada"),
    ).toBeInTheDocument();
    expect(calls[0]).toMatchObject({
      url: "/auth/password-reset/confirm",
      data: { token: "tok-1234567890", password: "contraseña-larga" },
    });
    expect(
      screen.getByRole("link", { name: "Iniciar sesión" }),
    ).toHaveAttribute("href", "/login");
  });

  it("says when the link no longer works and offers a new one", async () => {
    fakeApi(http, () => apiError(400, "auth.invalid_reset"));
    renderWithProviders(<ResetPassword />);
    for (const label of ["Contraseña nueva", "Repite la contraseña"]) {
      await userEvent.type(screen.getByLabelText(label), "contraseña-larga");
    }
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar contraseña" }),
    );
    expect(
      await screen.findByText("Este enlace ya no es válido. Pide uno nuevo."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Pedir un enlace nuevo" }),
    ).toBeVisible();
  });
});
