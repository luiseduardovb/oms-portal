import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http } from "@/api/http";
import { sessionStarted } from "@/auth/sessionSlice";
import { setAccessToken } from "@/auth/tokenStore";
import { NAV_ITEMS, visibleNav } from "@/components/shell/nav";
import { listParams } from "@/orders/ordersApi";
import { readSoundPreference, saveSoundPreference } from "@/orders/sound";
import {
  canCancel,
  mapLink,
  nextAction,
  todayISO,
  whatsappLink,
} from "@/orders/status";
import { makeStore } from "@/store";
import OrdersPage from "../src/app/(app)/orders/page";
import { apiError, fakeApi, ME } from "./fakeApi";
import { renderWithProviders } from "./render";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/orders",
}));
vi.mock("@/orders/useOrderEvents", () => ({
  useOrderEvents: () => "live",
}));
vi.mock("@/orders/sound", async (original) => ({
  ...(await original<typeof import("@/orders/sound")>()),
  unlockSound: vi.fn(async () => true),
  playAlert: vi.fn(() => true),
}));

const SUMMARY = {
  id: 1,
  orderNumber: 12,
  publicCode: "K7M2QX",
  status: "pending",
  fulfillmentType: "delivery",
  source: "storefront",
  outletId: 7,
  outletName: "Centro",
  placedAt: "2026-11-06T16:20:00Z",
  scheduledFor: null,
  expiresAt: "2026-11-06T16:35:00Z",
  acceptedAt: null,
  readyAt: null,
  dispatchedAt: null,
  completedAt: null,
  cancelledAt: null,
  cancelReasonCode: null,
  version: 3,
  customerName: "María Pérez",
  customerPhone: "99887766",
  itemCount: 2,
  currencyCode: "HNL",
  total: "230.00",
  amountDue: "230.00",
  paymentMethod: "cash",
  paymentStatus: "unpaid",
};
const DETAIL = {
  ...SUMMARY,
  customerNotes: "Sin cebolla",
  deliveryAddressText: "Col. Kennedy, casa 4",
  deliveryReference: "Frente a la pulpería",
  driverName: null,
  driverPhone: null,
  taxLabel: "ISV",
  taxRate: "0.15",
  itemsTotal: "200.00",
  discountTotal: "0.00",
  deliveryFee: "30.00",
  taxIncluded: "0.00",
  taxAdded: "0.00",
  tipAmount: "0.00",
  cashPayWith: "300.00",
  lines: [
    {
      id: 1,
      productId: 3,
      productName: "Baleada",
      sku: null,
      quantity: 2,
      unitPrice: "100.00",
      priceIncludesTax: true,
      optionsPerUnit: "0.00",
      lineAmount: "200.00",
      notes: null,
      options: [],
      imageUrl: "https://files/baleada-thumb.webp",
    },
  ],
  history: [
    {
      status: "pending",
      fromStatus: null,
      at: "2026-11-06T16:20:00Z",
      actorType: "customer",
      actorName: null,
      reason: null,
    },
  ],
};
const COUNTS = {
  pending: 1,
  accepted: 0,
  ready: 2,
  dispatched: 0,
  completed: 4,
  cancelled: 1,
  all: 8,
};
const OUTLET = {
  id: 7,
  name: "Centro",
  addressText: null,
  phone: null,
  timezone: "America/Tegucigalpa",
  isPublic: true,
  pickupEnabled: true,
  deliveryEnabled: true,
  isBusy: false,
  archivedAt: null,
};

const MANAGER = { ...ME, levels: { orders: "full" } };
const VIEWER = { ...ME, levels: { orders: "view" } };

type Handler = Parameters<typeof fakeApi>[1];

function open(me: object = MANAGER, extra: Handler = () => ({ status: 404 })) {
  const store = makeStore();
  store.dispatch(sessionStarted());
  setAccessToken("token");
  const api = fakeApi(http, (call) => {
    const override = extra(call);
    if (override.status !== 404) return override;
    if (call.url === "/me") return { status: 200, data: me };
    if (call.url === "/outlets") return { status: 200, data: [OUTLET] };
    if (call.url === "/orders/counts") return { status: 200, data: COUNTS };
    if (call.url === "/orders" && call.method === "GET") {
      return {
        status: 200,
        data: {
          page: 1,
          itemsPerPage: 25,
          totalPages: 1,
          totalCount: 1,
          results: [SUMMARY],
        },
      };
    }
    if (call.url === "/orders/1" && call.method === "GET") {
      return { status: 200, data: DETAIL };
    }
    return { status: 404 };
  });
  renderWithProviders(<OrdersPage />, store);
  return api;
}

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  setAccessToken(null);
  vi.restoreAllMocks();
});

describe("order helpers", () => {
  it("picks the next step by fulfillment type", () => {
    expect(nextAction("pending", "pickup")).toBe("accept");
    expect(nextAction("accepted", "delivery")).toBe("ready");
    expect(nextAction("ready", "delivery")).toBe("dispatch");
    expect(nextAction("ready", "pickup")).toBe("complete");
    expect(nextAction("dispatched", "delivery")).toBe("complete");
    expect(nextAction("completed", "pickup")).toBeNull();
    expect(canCancel("ready")).toBe(true);
    expect(canCancel("completed")).toBe(false);
  });

  it("builds WhatsApp links and local dates", () => {
    expect(whatsappLink("9988-7766")).toBe("https://wa.me/50499887766");
    expect(whatsappLink("+1 (555) 123 4567")).toBe("https://wa.me/15551234567");
    expect(todayISO(new Date(2026, 10, 6))).toBe("2026-11-06");
  });

  it("builds a map link from the address", () => {
    expect(mapLink("Col. Kennedy, casa 4")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Col.%20Kennedy%2C%20casa%204",
    );
  });

  it("sends repeated statuses the way the API expects", () => {
    const params = listParams({
      page: 1,
      itemsPerPage: 25,
      status: ["pending", "accepted"],
      openAnyDate: true,
      q: "ana",
    });
    expect(params.toString()).toBe(
      "page=1&itemsPerPage=25&status=pending&status=accepted&openAnyDate=true&q=ana",
    );
  });

  it("remembers the sound choice and survives blocked storage", () => {
    expect(readSoundPreference()).toBe(false);
    saveSoundPreference(true);
    expect(readSoundPreference()).toBe(true);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readSoundPreference()).toBe(false);
  });

  it("shows Pedidos in the menu only to roles with orders access", () => {
    expect(NAV_ITEMS.find((i) => i.key === "orders")).toBeTruthy();
    expect(
      visibleNav(NAV_ITEMS, { orders: "view" }).map((i) => i.key),
    ).toContain("orders");
    expect(
      visibleNav(NAV_ITEMS, { catalog: "full" }).map((i) => i.key),
    ).not.toContain("orders");
  });
});

describe("orders page", () => {
  it("lists orders with counts on the tabs, open orders first", async () => {
    const api = open();
    expect(await screen.findByText("#K7M2QX")).toBeInTheDocument();
    expect(screen.getByText("María Pérez")).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Pendientes (1)" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Todos (8)" })).toBeInTheDocument();
    const list = api.calls.find((c) => c.url === "/orders");
    const params = list?.params as unknown as URLSearchParams;
    expect(params.getAll("status")).toEqual(["pending"]);
    expect(params.get("openAnyDate")).toBe("true");
    expect(params.get("dateFrom")).toBe(todayISO());
  });

  it("changes tab and loads cancelled orders from the More menu", async () => {
    const api = open();
    await screen.findByText("#K7M2QX");
    await userEvent.click(screen.getByRole("tab", { name: "Listos (2)" }));
    await waitFor(() =>
      expect(
        api.calls
          .filter((c) => c.url === "/orders")
          .some(
            (c) =>
              (c.params as unknown as URLSearchParams).get("status") ===
              "ready",
          ),
      ).toBe(true),
    );
    await userEvent.click(screen.getByRole("tab", { name: "Más" }));
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Cancelados (1)" }),
    );
    await waitFor(() =>
      expect(
        api.calls.some(
          (c) =>
            c.url === "/orders" &&
            (c.params as unknown as URLSearchParams).get("status") ===
              "cancelled",
        ),
      ).toBe(true),
    );
  });

  it("opens a row in place with items, contact and timeline", async () => {
    open();
    await userEvent.click(
      await screen.findByRole("button", { name: /K7M2QX/ }),
    );
    expect(await screen.findByText("2× Baleada")).toBeInTheDocument();
    expect(screen.getByText("Col. Kennedy, casa 4")).toBeInTheDocument();
    expect(screen.getByText("Sin cebolla")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copiar número" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Enviar por WhatsApp" }),
    ).toHaveAttribute("href", "https://wa.me/50499887766");
    expect(screen.getByText("Historial")).toBeInTheDocument();
  });

  it("shows the product photo and a map link for delivery", async () => {
    open();
    await userEvent.click(
      await screen.findByRole("button", { name: /K7M2QX/ }),
    );
    expect(await screen.findByRole("img", { name: "Baleada" })).toHaveAttribute(
      "src",
      "https://files/baleada-thumb.webp",
    );
    expect(screen.getByRole("link", { name: "Ver mapa" })).toHaveAttribute(
      "href",
      expect.stringContaining("google.com/maps/search"),
    );
  });

  it("hides contact buttons when the phone is not visible to this role", async () => {
    const hidden = { ...DETAIL, customerPhone: null };
    open(MANAGER, (call) =>
      call.url === "/orders/1"
        ? { status: 200, data: hidden }
        : { status: 404 },
    );
    await userEvent.click(
      await screen.findByRole("button", { name: /K7M2QX/ }),
    );
    await screen.findByText("2× Baleada");
    expect(screen.queryByRole("button", { name: "Copiar número" })).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Enviar por WhatsApp" }),
    ).toBeNull();
  });

  it("accepts an order with the version it was read at", async () => {
    const api = open(MANAGER, (call) =>
      call.url === "/orders/1/accept"
        ? { status: 200, data: { ...DETAIL, status: "accepted" } }
        : { status: 404 },
    );
    await userEvent.click(
      await screen.findByRole("button", { name: /K7M2QX/ }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Aceptar" }),
    );
    await waitFor(() =>
      expect(api.calls.find((c) => c.url === "/orders/1/accept")?.data).toEqual(
        {
          version: 3,
        },
      ),
    );
  });

  it("cancels with a reason and requires a note for Otro", async () => {
    const api = open(MANAGER, (call) =>
      call.url === "/orders/1/cancel"
        ? { status: 200, data: { ...DETAIL, status: "cancelled" } }
        : { status: 404 },
    );
    await userEvent.click(
      await screen.findByRole("button", { name: /K7M2QX/ }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Cancelar pedido" }),
    );
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: "Otro" }));
    const confirm = within(dialog).getByRole("button", {
      name: "Cancelar pedido",
    });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("Nota"), {
      target: { value: "Cierre por lluvia" },
    });
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    await waitFor(() =>
      expect(api.calls.find((c) => c.url === "/orders/1/cancel")?.data).toEqual(
        {
          version: 3,
          reasonCode: "other",
          note: "Cierre por lluvia",
        },
      ),
    );
  });

  it("shows a readable message when the order changed meanwhile", async () => {
    open(MANAGER, (call) =>
      call.url === "/orders/1/accept"
        ? apiError(409, "orders.version_conflict")
        : { status: 404 },
    );
    await userEvent.click(
      await screen.findByRole("button", { name: /K7M2QX/ }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Aceptar" }),
    );
    expect(
      await screen.findByText(/cambió mientras lo veías/),
    ).toBeInTheDocument();
  });

  it("gives view-only roles no action buttons", async () => {
    open(VIEWER);
    await userEvent.click(
      await screen.findByRole("button", { name: /K7M2QX/ }),
    );
    await screen.findByText("2× Baleada");
    expect(screen.queryByRole("button", { name: "Aceptar" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Cancelar pedido" }),
    ).toBeNull();
  });

  it("turns the alert sound on and remembers it", async () => {
    open();
    await userEvent.click(
      await screen.findByRole("button", { name: "Activar sonido" }),
    );
    expect(
      await screen.findByRole("button", { name: "Silenciar" }),
    ).toBeInTheDocument();
    expect(readSoundPreference()).toBe(true);
  });

  it("refuses roles without orders access", async () => {
    open({ ...ME, levels: { catalog: "full" } });
    expect(
      await screen.findByText("No tienes permiso para ver los pedidos."),
    ).toBeInTheDocument();
  });
});
