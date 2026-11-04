import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { http } from "@/api/http";
import { sessionStarted } from "@/auth/sessionSlice";
import { setAccessToken } from "@/auth/tokenStore";
import { makeStore } from "@/store";
import { invitationLink, whatsappLink } from "@/team/teamApi";
import TeamPage from "../src/app/(app)/team/page";
import { apiError, fakeApi, ME } from "./fakeApi";
import { renderWithProviders } from "./render";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/team",
}));

const ROLES = [
  {
    id: 1,
    name: "Owner",
    templateKey: "owner",
    isLocked: true,
    levels: {},
    extras: [],
  },
  {
    id: 2,
    name: "Manager",
    templateKey: "manager",
    isLocked: true,
    levels: {},
    extras: [],
  },
  {
    id: 3,
    name: "Operator",
    templateKey: "operator",
    isLocked: true,
    levels: {},
    extras: [],
  },
];

function member(
  id: number,
  first: string,
  role: (typeof ROLES)[number],
  status = "active",
) {
  return {
    id,
    userId: id + 100,
    email: `${first.toLowerCase()}@example.com`,
    firstName: first,
    lastName: "Prueba",
    roleId: role.id,
    roleName: role.name,
    templateKey: role.templateKey,
    allOutlets: true,
    status,
    createdAt: "2026-11-01T00:00:00Z",
  };
}

// ME is member 5 (a manager); the owner and an operator are others.
const MEMBERS = [
  member(1, "Olga", ROLES[0]!),
  member(5, "Ana", ROLES[1]!),
  member(7, "Omar", ROLES[2]!),
];
const INVITATIONS = [
  {
    id: 9,
    email: "nuevo@example.com",
    roleId: 3,
    roleName: "Operator",
    allOutlets: true,
    expiresAt: "2026-11-11T00:00:00Z",
    createdAt: "2026-11-04T00:00:00Z",
  },
];

function setup(
  me: object = ME,
  overrides: Parameters<typeof fakeApi>[1] = () => ({ status: 404 }),
) {
  const store = makeStore();
  store.dispatch(sessionStarted());
  setAccessToken("token");
  const api = fakeApi(http, (call) => {
    if (call.url === "/me") return { status: 200, data: me };
    if (call.url === "/team/members" && call.method === "GET")
      return { status: 200, data: MEMBERS };
    if (call.url === "/team/roles") return { status: 200, data: ROLES };
    if (call.url === "/team/invitations" && call.method === "GET")
      return { status: 200, data: INVITATIONS };
    return overrides(call);
  });
  renderWithProviders(<TeamPage />, store);
  return api;
}

afterEach(() => setAccessToken(null));

describe("Team page", () => {
  it("lists members and offers changes only where allowed", async () => {
    setup();
    const table = await screen.findByRole("table", {
      name: "Miembros del equipo",
    });
    // A manager cannot touch the owner, and cannot change themselves.
    const owner = within(table).getByText("Olga Prueba").closest("tr")!;
    expect(within(owner).queryByRole("button", { name: "Quitar" })).toBeNull();
    const self = within(table).getByText("Ana Prueba").closest("tr")!;
    expect(within(self).getByText("Tú")).toBeInTheDocument();
    expect(within(self).queryByRole("button", { name: "Quitar" })).toBeNull();
    const operator = within(table).getByText("Omar Prueba").closest("tr")!;
    expect(
      within(operator).getByRole("button", { name: "Suspender" }),
    ).toBeInTheDocument();
  });

  it("suspends a member", async () => {
    const { calls } = setup(ME, () => ({ status: 204 }));
    const row = (await screen.findByText("Omar Prueba")).closest("tr")!;
    await userEvent.click(
      within(row).getByRole("button", { name: "Suspender" }),
    );
    await waitFor(() =>
      expect(calls.find((c) => c.method === "PATCH")).toMatchObject({
        url: "/team/members/7",
        data: { status: "suspended" },
      }),
    );
  });

  it("removes a member only after confirming", async () => {
    const { calls } = setup(ME, () => ({ status: 204 }));
    const row = (await screen.findByText("Omar Prueba")).closest("tr")!;
    await userEvent.click(within(row).getByRole("button", { name: "Quitar" }));
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Quitar",
      }),
    );
    await waitFor(() =>
      expect(calls.find((c) => c.method === "DELETE")?.url).toBe(
        "/team/members/7",
      ),
    );
  });

  it("shows the Spanish text when the server refuses a change", async () => {
    setup(ME, () => apiError(403, "team.owner_only"));
    const row = (await screen.findByText("Omar Prueba")).closest("tr")!;
    await userEvent.click(
      within(row).getByRole("button", { name: "Suspender" }),
    );
    expect(
      await screen.findByText("Solo un dueño puede hacer esto con un dueño."),
    ).toBeInTheDocument();
  });

  it("hides every action from someone who can only view", async () => {
    setup({ ...ME, levels: { team: "view" } });
    await screen.findByRole("table", { name: "Miembros del equipo" });
    expect(screen.queryByRole("button", { name: "Invitar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Suspender" })).toBeNull();
  });

  it("tells someone without the team area they have no access", async () => {
    setup({ ...ME, levels: { orders: "full" } });
    expect(
      await screen.findByText("No tienes permiso para ver el equipo."),
    ).toBeInTheDocument();
  });

  it("creates an invitation and offers the link and WhatsApp", async () => {
    const { calls } = setup(ME, (call) =>
      call.method === "POST"
        ? {
            status: 201,
            data: {
              ...INVITATIONS[0],
              email: "lu@example.com",
              token: "tok-abc 123",
            },
          }
        : { status: 404 },
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Invitar" }),
    );
    const dialog = screen.getByRole("dialog");
    await userEvent.type(
      within(dialog).getByLabelText("Correo electrónico"),
      "lu@example.com",
    );
    await userEvent.click(
      within(dialog).getByRole("combobox", { name: "Rol" }),
    );
    await userEvent.click(screen.getByRole("option", { name: "Operator" }));
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Crear invitación" }),
    );

    const link = await within(screen.getByRole("dialog")).findByLabelText(
      "Enlace de invitación",
    );
    expect(link).toHaveValue(
      `${window.location.origin}/accept-invitation?token=tok-abc%20123`,
    );
    expect(calls.find((c) => c.method === "POST")?.data).toEqual({
      email: "lu@example.com",
      roleId: 3,
      allOutlets: true,
    });
    const whatsapp = screen.getByRole("link", {
      name: "Compartir por WhatsApp",
    });
    expect(whatsapp.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(whatsapp.getAttribute("href")!)).toContain(
      "tok-abc%20123",
    );
  });

  it("does not offer the owner role to a manager", async () => {
    setup();
    await userEvent.click(
      await screen.findByRole("button", { name: "Invitar" }),
    );
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("combobox", { name: "Rol" }),
    );
    expect(screen.queryByRole("option", { name: "Owner" })).toBeNull();
    expect(screen.getByRole("option", { name: "Manager" })).toBeInTheDocument();
  });

  it("revokes a pending invitation", async () => {
    const { calls } = setup(ME, () => ({ status: 204 }));
    await userEvent.click(
      await screen.findByRole("tab", { name: /Invitaciones pendientes/ }),
    );
    expect(await screen.findByText("nuevo@example.com")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Revocar" }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === "DELETE")?.url).toBe(
        "/team/invitations/9",
      ),
    );
  });
});

describe("invitation links", () => {
  it("encodes the token", () => {
    expect(invitationLink("https://app.test", "a b/c")).toBe(
      "https://app.test/accept-invitation?token=a%20b%2Fc",
    );
    expect(whatsappLink("hola & adiós")).toBe(
      "https://wa.me/?text=hola%20%26%20adi%C3%B3s",
    );
  });
});
