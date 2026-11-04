import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http } from "@/api/http";
import { getAccessToken, setAccessToken } from "@/auth/tokenStore";
import { sessionStarted } from "@/auth/sessionSlice";
import { makeStore } from "@/store";
import { LoginForm } from "../src/app/login/LoginForm";
import { apiError, fakeApi, TOKENS } from "./fakeApi";
import { renderWithProviders } from "./render";

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => "/",
}));

beforeEach(() => {
  replace.mockReset();
  search = "";
});
afterEach(() => setAccessToken(null));

describe("LoginForm", () => {
  it("asks for both fields before calling the API", async () => {
    const { calls } = fakeApi(http, () => ({ status: 200, data: TOKENS }));
    renderWithProviders(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(await screen.findByText("Ingresa tu correo.")).toBeInTheDocument();
    expect(screen.getByText("Ingresa tu contraseña.")).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it("signs in and goes to the page the user wanted", async () => {
    search = "next=%2Fteam";
    const { calls } = fakeApi(http, () => ({ status: 200, data: TOKENS }));
    renderWithProviders(<LoginForm />);
    await userEvent.type(
      screen.getByLabelText("Correo electrónico"),
      "ana@example.com",
    );
    await userEvent.type(screen.getByLabelText("Contraseña"), "secreto");
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/team"));
    expect(calls[0]).toMatchObject({
      method: "POST",
      url: "/auth/login",
      data: { email: "ana@example.com", password: "secreto" },
    });
    expect(getAccessToken()).toBe("new-token");
  });

  it("shows the Spanish text for the API's error code", async () => {
    fakeApi(http, () => apiError(401, "auth.invalid_credentials"));
    renderWithProviders(<LoginForm />);
    await userEvent.type(
      screen.getByLabelText("Correo electrónico"),
      "ana@example.com",
    );
    await userEvent.type(screen.getByLabelText("Contraseña"), "mala");
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(
      await screen.findByText("El correo o la contraseña no son correctos."),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
  });

  it("shows the rate limit message", async () => {
    fakeApi(http, () => apiError(429, "common.rate_limited"));
    renderWithProviders(<LoginForm />);
    await userEvent.type(
      screen.getByLabelText("Correo electrónico"),
      "ana@example.com",
    );
    await userEvent.type(screen.getByLabelText("Contraseña"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(
      await screen.findByText("Demasiados intentos. Espera un momento."),
    ).toBeInTheDocument();
  });

  it("leaves the login screen when a session already exists", async () => {
    const store = makeStore();
    store.dispatch(sessionStarted());
    renderWithProviders(<LoginForm />, store);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });
});
