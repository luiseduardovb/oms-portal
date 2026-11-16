import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { http } from "@/api/http";
import { sessionStarted } from "@/auth/sessionSlice";
import { setAccessToken } from "@/auth/tokenStore";
import { makeStore } from "@/store";
import Page from "../src/app/(app)/marketing/vouchers/page";
import NewPage from "../src/app/(app)/marketing/vouchers/new/page";
import EditPage from "../src/app/(app)/marketing/vouchers/[id]/page";
import { apiError, fakeApi, ME } from "./fakeApi";
import { renderWithProviders } from "./render";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push }),
  useParams: () => ({ id: "1" }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/marketing/vouchers",
}));

function voucher(id: number, code: string, extra: object = {}) {
  return {
    id,
    code,
    description: "",
    type: "percentage",
    value: "10.00",
    maxDiscount: null,
    appliesTo: "entire_order",
    minOrderAmount: "0.00",
    totalUsageLimit: 1,
    perCustomerLimit: null,
    redeemedCount: 0,
    happyHourStart: null,
    happyHourEnd: null,
    startsAt: "2026-05-23T06:00:00Z",
    endsAt: null,
    visibility: "private",
    assignedPhone: null,
    allOutlets: true,
    outletIds: [] as number[],
    isActive: true,
    status: "active",
    createdAt: "2026-11-01T00:00:00Z",
    ...extra,
  };
}

const VOUCHERS = [
  voucher(1, "WELCOME10"),
  voucher(2, "OLDONE", { status: "expired", endsAt: "2026-06-07T06:00:00Z" }),
  voucher(3, "SHIPFREE", {
    type: "free_delivery",
    value: null,
    visibility: "public",
    redeemedCount: 3,
    totalUsageLimit: null,
  }),
];

const MANAGER = { ...ME, levels: { marketing: "full" } };

function setup(
  me: object = MANAGER,
  overrides: Parameters<typeof fakeApi>[1] = () => ({ status: 404 }),
  View: () => ReactElement = () => <Page />,
) {
  const store = makeStore();
  store.dispatch(sessionStarted());
  setAccessToken("token");
  const api = fakeApi(http, (call) => {
    if (call.url === "/me") return { status: 200, data: me };
    if (call.url === "/merchant/vouchers" && call.method === "GET")
      return { status: 200, data: { vouchers: VOUCHERS } };
    if (call.url === "/outlets" && call.method === "GET")
      return {
        status: 200,
        data: [
          { id: 1, name: "Centro" },
          { id: 2, name: "Norte" },
        ],
      };
    return overrides(call);
  });
  renderWithProviders(<View />, store);
  return api;
}

afterEach(() => setAccessToken(null));

describe("Vouchers page", () => {
  it("lists the vouchers with their usage and status", async () => {
    setup();
    const row = (await screen.findByText("WELCOME10")).closest("tr")!;
    expect(within(row).getByText("Porcentaje")).toBeInTheDocument();
    expect(within(row).getByText("0 / 1")).toBeInTheDocument();
    expect(within(row).getByText("Activo")).toBeInTheDocument();
    const free = screen.getByText("SHIPFREE").closest("tr")!;
    expect(within(free).getByText("Envío gratis")).toBeInTheDocument();
    expect(within(free).getByText("3 / ∞")).toBeInTheDocument();
  });

  it("filters by tab", async () => {
    setup();
    await screen.findByText("WELCOME10");
    await userEvent.click(screen.getByRole("tab", { name: "Vencidos" }));
    expect(screen.getByText("OLDONE")).toBeInTheDocument();
    expect(screen.queryByText("WELCOME10")).toBeNull();
  });

  it("switches a voucher between public and private", async () => {
    const { calls } = setup(MANAGER, () => ({
      status: 200,
      data: voucher(1, "WELCOME10", { visibility: "public" }),
    }));
    const row = (await screen.findByText("WELCOME10")).closest("tr")!;
    await userEvent.click(within(row).getByRole("button", { name: "Público" }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === "PATCH")).toMatchObject({
        url: "/merchant/vouchers/1",
        data: { visibility: "public" },
      }),
    );
  });

  it("deactivates and archives from the row menu", async () => {
    const { calls } = setup(MANAGER, (call) =>
      call.method === "DELETE"
        ? { status: 204 }
        : { status: 200, data: voucher(1, "WELCOME10") },
    );
    const row = (await screen.findByText("WELCOME10")).closest("tr")!;
    await userEvent.click(
      within(row).getByRole("button", {
        name: "Acciones del voucher WELCOME10",
      }),
    );
    await userEvent.click(screen.getByRole("menuitem", { name: "Desactivar" }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === "PATCH")).toMatchObject({
        url: "/merchant/vouchers/1",
        data: { isActive: false },
      }),
    );
    await userEvent.click(
      within(row).getByRole("button", {
        name: "Acciones del voucher WELCOME10",
      }),
    );
    await userEvent.click(screen.getByRole("menuitem", { name: "Archivar" }));
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Archivar",
      }),
    );
    await waitFor(() =>
      expect(calls.find((c) => c.method === "DELETE")).toMatchObject({
        url: "/merchant/vouchers/1",
      }),
    );
  });

  it("creates a voucher", async () => {
    const { calls } = setup(
      MANAGER,
      (call) =>
        call.method === "POST"
          ? { status: 201, data: voucher(9, "NUEVO15") }
          : { status: 404 },
      () => <NewPage />,
    );
    await screen.findByText("Agregar voucher");
    const dialog = document.body;
    // Saving with nothing filled in asks for the code and the value.
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Guardar" }),
    );
    expect(
      within(dialog).getByText(/El código lleva de 3 a 40/),
    ).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST")).toBe(false);
    await userEvent.type(
      within(dialog).getByLabelText("Código del voucher"),
      "nuevo15",
    );
    await userEvent.type(
      within(dialog).getByLabelText("Porcentaje de descuento"),
      "15",
    );
    await userEvent.type(
      within(dialog).getByLabelText("Usos por cliente (opcional)"),
      "1",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Guardar" }),
    );
    await waitFor(() =>
      expect(calls.find((c) => c.method === "POST")).toMatchObject({
        url: "/merchant/vouchers",
        data: {
          code: "nuevo15",
          type: "percentage",
          value: "15",
          perCustomerLimit: 1,
          visibility: "public",
          allOutlets: true,
          outletIds: [],
          isActive: true,
        },
      }),
    );
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/marketing/vouchers"),
    );
  });

  it("shows the server's refusal and keeps the form open", async () => {
    setup(
      MANAGER,
      (call) =>
        call.method === "POST"
          ? apiError(409, "vouchers.code_taken")
          : { status: 404 },
      () => <NewPage />,
    );
    await screen.findByText("Agregar voucher");
    const dialog = document.body;
    await userEvent.type(
      within(dialog).getByLabelText("Código del voucher"),
      "WELCOME10",
    );
    await userEvent.type(
      within(dialog).getByLabelText("Porcentaje de descuento"),
      "10",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Guardar" }),
    );
    expect(
      await within(dialog).findByText("Ya existe un voucher con ese código."),
    ).toBeInTheDocument();
  });

  it("opens the add page from the list and edits on its own page", async () => {
    setup();
    const add = await screen.findByRole("link", { name: "Agregar voucher" });
    expect(add).toHaveAttribute("href", "/marketing/vouchers/new");
    setup(
      MANAGER,
      () => ({ status: 404 }),
      () => <EditPage />,
    );
    expect(await screen.findByDisplayValue("WELCOME10")).toBeInTheDocument();
  });

  it("is read-only with view access", async () => {
    setup({ ...ME, levels: { marketing: "view" } });
    await screen.findByText("WELCOME10");
    expect(
      screen.queryByRole("button", { name: "Agregar voucher" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Acciones del voucher WELCOME10" }),
    ).toBeNull();
  });
});
