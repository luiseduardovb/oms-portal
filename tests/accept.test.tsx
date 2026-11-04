import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { http } from "@/api/http";
import { AcceptInvitation } from "../src/app/accept-invitation/AcceptInvitation";
import { apiError, fakeApi } from "./fakeApi";
import { renderWithProviders } from "./render";

let search = "token=tok-1234567890";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => "/accept-invitation",
}));

const PREVIEW = {
  merchantName: "Café Uno",
  roleName: "Manager",
  requiresDni: false,
  userExists: false,
};

function setup(preview: object | ReturnType<typeof apiError>, accepted = {}) {
  return fakeApi(http, (call) => {
    if (call.url === "/team/invitations/preview") {
      return "status" in preview
        ? (preview as { status: number; data?: unknown })
        : { status: 200, data: preview };
    }
    if (call.url === "/team/invitations/accept") {
      return {
        status: 200,
        data: {
          merchantId: 10,
          merchantName: "Café Uno",
          merchantSlug: "cafe-uno",
          userCreated: true,
          ...accepted,
        },
      };
    }
    return { status: 404 };
  });
}

beforeEach(() => {
  search = "token=tok-1234567890";
});

describe("AcceptInvitation", () => {
  it("shows an invalid-invitation page without a token", async () => {
    search = "";
    const { calls } = setup(PREVIEW);
    renderWithProviders(<AcceptInvitation />);
    expect(await screen.findByText("Invitación no válida")).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it("shows the Spanish message when the invitation is not valid", async () => {
    setup(apiError(410, "team.invitation_invalid"));
    renderWithProviders(<AcceptInvitation />);
    expect(
      await screen.findByText(
        "Esta invitación ya no es válida. Pide una nueva.",
      ),
    ).toBeInTheDocument();
  });

  it("asks a new user for a name and a password of 10 characters", async () => {
    const { calls } = setup(PREVIEW);
    renderWithProviders(<AcceptInvitation />);
    expect(await screen.findByText("Únete a Café Uno")).toBeInTheDocument();
    expect(screen.getByText("Te invitaron como Manager.")).toBeInTheDocument();
    expect(screen.queryByLabelText("DNI")).toBeNull();

    await userEvent.type(screen.getByLabelText("Nombre"), "Ana");
    await userEvent.type(screen.getByLabelText("Apellido"), "López");
    await userEvent.type(
      screen.getByLabelText("Elige una contraseña"),
      "corta",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Aceptar invitación" }),
    );
    expect(
      await screen.findByText("La contraseña necesita al menos 10 caracteres."),
    ).toBeInTheDocument();
    expect(calls.some((c) => c.url.endsWith("/accept"))).toBe(false);

    await userEvent.clear(screen.getByLabelText("Elige una contraseña"));
    await userEvent.type(
      screen.getByLabelText("Elige una contraseña"),
      "contraseña-larga",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Aceptar invitación" }),
    );
    expect(await screen.findByText("¡Listo!")).toBeInTheDocument();
    expect(calls.find((c) => c.url.endsWith("/accept"))?.data).toMatchObject({
      token: "tok-1234567890",
      password: "contraseña-larga",
      firstName: "Ana",
      lastName: "López",
    });
    expect(
      screen.getByRole("link", { name: "Ir a iniciar sesión" }),
    ).toHaveAttribute("href", "/login");
  });

  it("asks an existing user only for their current password", async () => {
    const { calls } = setup({ ...PREVIEW, userExists: true });
    renderWithProviders(<AcceptInvitation />);
    await userEvent.type(
      await screen.findByLabelText("Tu contraseña actual"),
      "x",
    );
    expect(screen.queryByLabelText("Nombre")).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Aceptar invitación" }),
    );
    await waitFor(() =>
      expect(calls.find((c) => c.url.endsWith("/accept"))?.data).toEqual({
        token: "tok-1234567890",
        password: "x",
      }),
    );
  });

  it("requires a DNI for an owner invitation", async () => {
    const { calls } = setup({ ...PREVIEW, requiresDni: true });
    renderWithProviders(<AcceptInvitation />);
    await userEvent.type(
      await screen.findByLabelText("Elige una contraseña"),
      "contraseña-larga",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Aceptar invitación" }),
    );
    expect(await screen.findByText("Ingresa tu DNI.")).toBeInTheDocument();
    expect(calls.some((c) => c.url.endsWith("/accept"))).toBe(false);
    await userEvent.type(screen.getByLabelText("DNI"), "0801-1990-12345");
    await userEvent.click(
      screen.getByRole("button", { name: "Aceptar invitación" }),
    );
    await screen.findByText("¡Listo!");
    expect(calls.find((c) => c.url.endsWith("/accept"))?.data).toMatchObject({
      dni: "0801-1990-12345",
    });
  });

  it("shows the server's reason when accepting fails", async () => {
    fakeApi(http, (call) =>
      call.url.endsWith("/preview")
        ? { status: 200, data: { ...PREVIEW, userExists: true } }
        : apiError(401, "auth.invalid_credentials"),
    );
    renderWithProviders(<AcceptInvitation />);
    await userEvent.type(
      await screen.findByLabelText("Tu contraseña actual"),
      "mala",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Aceptar invitación" }),
    );
    expect(
      await screen.findByText("El correo o la contraseña no son correctos."),
    ).toBeInTheDocument();
  });
});
