import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { http } from "@/api/http";
import { sessionStarted } from "@/auth/sessionSlice";
import { setAccessToken } from "@/auth/tokenStore";
import { makeStore } from "@/store";
import EditPage from "../src/app/(app)/marketing/promotions/[id]/page";
import NewPage from "../src/app/(app)/marketing/promotions/new/page";
import Page from "../src/app/(app)/marketing/promotions/page";
import { apiError, fakeApi, ME } from "./fakeApi";
import { renderWithProviders } from "./render";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push }),
  useParams: () => ({ id: "1" }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/marketing/promotions",
}));

function promotion(id: number, name: string, extra: object = {}) {
  return {
    id,
    name,
    description: "",
    type: "percentage",
    value: "10.00",
    maxDiscount: null,
    scope: "entire_order",
    categoryIds: [] as number[],
    productIds: [] as number[],
    products: [] as { id: number; name: string }[],
    appliesTo: "entire_order",
    minOrderAmount: "0.00",
    happyHourStart: null,
    happyHourEnd: null,
    startsAt: null,
    endsAt: null,
    allOutlets: true,
    outletIds: [] as number[],
    isActive: true,
    status: "active",
    createdAt: "2026-11-01T00:00:00Z",
    ...extra,
  };
}

const PROMOTIONS = [
  promotion(1, "Lunes de baleadas", {
    scope: "products",
    productIds: [7],
    products: [{ id: 7, name: "Baleada" }],
    value: "20.00",
  }),
  promotion(2, "Vieja", { status: "expired" }),
  promotion(3, "Sin envío", { type: "free_delivery", value: null }),
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
    if (call.url === "/merchant/promotions" && call.method === "GET")
      return { status: 200, data: { promotions: PROMOTIONS } };
    if (call.url === "/outlets" && call.method === "GET")
      return { status: 200, data: [{ id: 1, name: "Centro" }] };
    if (call.url === "/categories" && call.method === "GET")
      return { status: 200, data: [] };
    if (call.url === "/products" && call.method === "GET")
      return {
        status: 200,
        data: {
          page: 1,
          itemsPerPage: 20,
          totalPages: 1,
          totalCount: 0,
          results: [],
        },
      };
    return overrides(call);
  });
  renderWithProviders(<View />, store);
  return api;
}

afterEach(() => setAccessToken(null));

describe("Promotions page", () => {
  it("lists promotions with what they take off and their status", async () => {
    setup();
    const row = (await screen.findByText("Lunes de baleadas")).closest("tr")!;
    expect(within(row).getByText("20% de descuento")).toBeInTheDocument();
    expect(within(row).getByText("Algunos productos")).toBeInTheDocument();
    const free = screen.getByText("Sin envío").closest("tr")!;
    expect(within(free).getByText("Envío gratis")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Vencidos" }));
    expect(screen.getByText("Vieja")).toBeInTheDocument();
    expect(screen.queryByText("Lunes de baleadas")).toBeNull();
  });

  it("deactivates and archives from the row menu", async () => {
    const { calls } = setup(MANAGER, (call) =>
      call.method === "DELETE"
        ? { status: 204 }
        : { status: 200, data: PROMOTIONS[0] },
    );
    const row = (await screen.findByText("Lunes de baleadas")).closest("tr")!;
    const open = () =>
      userEvent.click(
        within(row).getByRole("button", {
          name: "Acciones de la promoción Lunes de baleadas",
        }),
      );
    await open();
    await userEvent.click(screen.getByRole("menuitem", { name: "Desactivar" }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === "PATCH")).toMatchObject({
        url: "/merchant/promotions/1",
        data: { isActive: false },
      }),
    );
    await open();
    await userEvent.click(screen.getByRole("menuitem", { name: "Archivar" }));
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Archivar",
      }),
    );
    await waitFor(() =>
      expect(calls.find((c) => c.method === "DELETE")).toMatchObject({
        url: "/merchant/promotions/1",
      }),
    );
  });

  it("opens the add page from the list", async () => {
    setup();
    const add = await screen.findByRole("link", { name: "Agregar promoción" });
    expect(add).toHaveAttribute("href", "/marketing/promotions/new");
  });

  it("creates a promotion for some products", async () => {
    const { calls } = setup(
      MANAGER,
      (call) =>
        call.method === "POST"
          ? { status: 201, data: promotion(9, "Nueva") }
          : { status: 404 },
      () => <NewPage />,
    );
    await screen.findByText("Agregar promoción");
    // Saving with nothing filled in asks for the name and the value.
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(screen.getAllByText("Obligatorio").length).toBeGreaterThan(0);
    expect(calls.some((c) => c.method === "POST")).toBe(false);
    await userEvent.type(
      screen.getByLabelText("Nombre de la promoción"),
      "Nueva",
    );
    await userEvent.type(
      screen.getByLabelText("Porcentaje de descuento"),
      "15",
    );
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === "POST")).toMatchObject({
        url: "/merchant/promotions",
        data: {
          name: "Nueva",
          type: "percentage",
          value: "15",
          scope: "entire_order",
          categoryIds: [],
          productIds: [],
          allOutlets: true,
          outletIds: [],
          isActive: true,
        },
      }),
    );
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/marketing/promotions"),
    );
  });

  it("asks for a product when the scope is some products", async () => {
    setup(
      MANAGER,
      () => ({ status: 404 }),
      () => <NewPage />,
    );
    await screen.findByText("Agregar promoción");
    await userEvent.type(
      screen.getByLabelText("Nombre de la promoción"),
      "Nueva",
    );
    await userEvent.type(
      screen.getByLabelText("Porcentaje de descuento"),
      "15",
    );
    await userEvent.click(
      screen.getByRole("radio", { name: "Solo algunos productos" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(
      await screen.findByText("Elige al menos un producto."),
    ).toBeInTheDocument();
  });

  it("shows the server's refusal and keeps the form", async () => {
    setup(
      MANAGER,
      (call) =>
        call.method === "POST"
          ? apiError(422, "promotions.product_not_found")
          : { status: 404 },
      () => <NewPage />,
    );
    await screen.findByText("Agregar promoción");
    await userEvent.type(
      screen.getByLabelText("Nombre de la promoción"),
      "Nueva",
    );
    await userEvent.type(
      screen.getByLabelText("Porcentaje de descuento"),
      "15",
    );
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(
      await screen.findByText(
        "Alguno de esos productos no existe o está archivado.",
      ),
    ).toBeInTheDocument();
  });

  it("edits on its own page, with the chosen products shown", async () => {
    setup(
      MANAGER,
      () => ({ status: 404 }),
      () => <EditPage />,
    );
    expect(
      await screen.findByDisplayValue("Lunes de baleadas"),
    ).toBeInTheDocument();
    expect(screen.getByText("Baleada")).toBeInTheDocument();
  });

  it("is read-only with view access", async () => {
    setup({ ...ME, levels: { marketing: "view" } });
    await screen.findByText("Lunes de baleadas");
    expect(
      screen.queryByRole("link", { name: "Agregar promoción" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: "Acciones de la promoción Lunes de baleadas",
      }),
    ).toBeNull();
  });
});
