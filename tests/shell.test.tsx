import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http } from "@/api/http";
import { RequireAuth } from "@/auth/RequireAuth";
import { sessionEnded, sessionStarted } from "@/auth/sessionSlice";
import { getAccessToken, setAccessToken } from "@/auth/tokenStore";
import { AppShell } from "@/components/shell/AppShell";
import { makeStore } from "@/store";
import { fakeApi, ME } from "./fakeApi";
import { renderWithProviders } from "./render";

const replace = vi.fn();
let pathname = "/";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => pathname,
}));

beforeEach(() => {
  replace.mockReset();
  pathname = "/";
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: true,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
});
afterEach(() => {
  setAccessToken(null);
  vi.unstubAllGlobals();
});

describe("RequireAuth", () => {
  it("shows a loading state until the session is known", () => {
    renderWithProviders(<RequireAuth>secreto</RequireAuth>);
    expect(screen.getByText("Cargando tu sesión…")).toBeInTheDocument();
    expect(screen.queryByText("secreto")).not.toBeInTheDocument();
  });

  it("sends visitors without a session to the login screen", async () => {
    pathname = "/team";
    const store = makeStore();
    store.dispatch(sessionEnded());
    renderWithProviders(<RequireAuth>secreto</RequireAuth>, store);
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/login?next=%2Fteam"),
    );
    expect(screen.queryByText("secreto")).not.toBeInTheDocument();
  });

  it("shows the page once signed in", () => {
    const store = makeStore();
    store.dispatch(sessionStarted());
    renderWithProviders(<RequireAuth>secreto</RequireAuth>, store);
    expect(screen.getByText("secreto")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});

describe("AppShell", () => {
  function signedIn() {
    const store = makeStore();
    store.dispatch(sessionStarted());
    setAccessToken("token-uno");
    return store;
  }

  it("shows the merchant, the user and the navigation", async () => {
    fakeApi(http, () => ({ status: 200, data: ME }));
    renderWithProviders(<AppShell>contenido</AppShell>, signedIn());
    expect(
      await screen.findByRole("button", { name: "Cambiar de comercio" }),
    ).toHaveTextContent("Café Uno");
    expect(screen.getByRole("link", { name: "Inicio" })).toBeInTheDocument();
    expect(screen.getByText("contenido")).toBeInTheDocument();
  });

  it("shows a plain name when there is only one merchant", async () => {
    fakeApi(http, () => ({
      status: 200,
      data: { ...ME, memberships: ME.memberships.slice(0, 1) },
    }));
    renderWithProviders(<AppShell>x</AppShell>, signedIn());
    expect(await screen.findByText("Café Uno")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cambiar de comercio" }),
    ).not.toBeInTheDocument();
  });

  it("switches merchant and keeps the new token", async () => {
    let merchant = ME.merchant;
    const { calls } = fakeApi(http, (call) => {
      if (call.url === "/auth/switch-merchant") {
        merchant = {
          id: 11,
          name: "Grill Dos",
          slug: "grill-dos",
          status: "draft",
          currencyCode: "HNL",
        };
        return {
          status: 200,
          data: {
            accessToken: "token-dos",
            tokenType: "bearer",
            expiresIn: 900,
            merchantId: 11,
          },
        };
      }
      return { status: 200, data: { ...ME, merchant } };
    });
    renderWithProviders(<AppShell>x</AppShell>, signedIn());
    await userEvent.click(
      await screen.findByRole("button", { name: "Cambiar de comercio" }),
    );
    await userEvent.click(screen.getByRole("menuitem", { name: "Grill Dos" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Cambiar de comercio" }),
      ).toHaveTextContent("Grill Dos"),
    );
    const switchCall = calls.find((c) => c.url === "/auth/switch-merchant");
    expect(switchCall?.data).toEqual({ merchantId: 11 });
    expect(getAccessToken()).toBe("token-dos");
    // The profile was fetched again with the new token.
    expect(calls.at(-1)).toMatchObject({
      url: "/me",
      authorization: "Bearer token-dos",
    });
  });

  it("signs out and goes to the login screen", async () => {
    const { calls } = fakeApi(http, (call) =>
      call.url === "/auth/logout" ? { status: 204 } : { status: 200, data: ME },
    );
    const store = signedIn();
    renderWithProviders(<AppShell>x</AppShell>, store);
    await userEvent.click(
      await screen.findByRole("button", { name: "Menú de usuario" }),
    );
    expect(screen.getByText("Manager")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("menuitem", { name: "Cerrar sesión" }),
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    const logout = calls.find((c) => c.url === "/auth/logout");
    expect(logout).toMatchObject({ method: "POST", csrf: "oms-portal" });
    expect(getAccessToken()).toBeNull();
    expect(store.getState().session.status).toBe("anonymous");
  });
});
