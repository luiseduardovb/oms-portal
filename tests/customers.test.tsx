import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { http } from "@/api/http";
import { sessionStarted } from "@/auth/sessionSlice";
import { setAccessToken } from "@/auth/tokenStore";
import { NAV_ITEMS, visibleNav } from "@/components/shell/nav";
import { customerParams } from "@/customers/customersApi";
import { avatarColor, initials, relativeDay } from "@/customers/format";
import { makeStore } from "@/store";
import CustomerDetailPage from "../src/app/(app)/customers/[id]/page";
import CustomersPage from "../src/app/(app)/customers/page";
import { fakeApi, ME } from "./fakeApi";
import { renderWithProviders } from "./render";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useParams: () => ({ id: "4" }),
  usePathname: () => "/customers",
}));

const ANA = {
  id: 4,
  name: "Ana López",
  phone: "+50499998888",
  email: "ana@example.com",
  firstOrderAt: "2026-10-01T16:00:00Z",
  lastOrderAt: "2026-11-10T18:00:00Z",
  ordersCount: 3,
  totalSpent: "1250.50",
  marketing: true,
};
const LUIS = {
  ...ANA,
  id: 5,
  name: "Luis",
  phone: null,
  email: null,
  ordersCount: 1,
  totalSpent: "95.00",
  marketing: false,
};

const MANAGER = { ...ME, levels: { ...ME.levels, analytics: "view" } };

function open(View: () => ReactElement, me: object = MANAGER) {
  const store = makeStore();
  store.dispatch(sessionStarted());
  setAccessToken("token");
  const api = fakeApi(http, (call) => {
    if (call.url === "/me") return { status: 200, data: me };
    if (call.url === "/customers") {
      return {
        status: 200,
        data: {
          page: 1,
          itemsPerPage: 25,
          totalPages: 1,
          totalCount: 2,
          results: [ANA, LUIS],
        },
      };
    }
    if (call.url === "/customers/summary") {
      return {
        status: 200,
        data: {
          customers: 2,
          returning: 1,
          marketing: 1,
          totalSpent: "1345.50",
        },
      };
    }
    if (call.url === "/customers/4") {
      return {
        status: 200,
        data: {
          ...ANA,
          orders: [
            {
              id: 9,
              orderNumber: 21,
              status: "completed",
              fulfillmentType: "delivery",
              outletName: "Centro",
              placedAt: "2026-11-10T17:00:00Z",
              total: "400.00",
            },
          ],
        },
      };
    }
    return { status: 404 };
  });
  renderWithProviders(<View />, store);
  return api;
}

describe("customers", () => {
  it("lists customers with the totals on top and consent only when given", async () => {
    open(CustomersPage);
    expect(await screen.findByText("Ana López")).toBeInTheDocument();
    expect(screen.getByText(/\+50499998888/)).toBeInTheDocument();
    expect(screen.getByText("L 1,250.50")).toBeInTheDocument();
    // The summary cards.
    expect(await screen.findByText("L 1,345.50")).toBeInTheDocument();
    expect(screen.getAllByText("50% de tus clientes")).toHaveLength(2);
    // Only the person who accepted offers carries the chip.
    expect(screen.getAllByText("Acepta ofertas")).toHaveLength(1);
    expect(screen.queryByText("No acepto")).not.toBeInTheDocument();
    expect(screen.getByText("Luis")).toBeInTheDocument();
    expect(
      screen.getByText("3 pedidos · ", { exact: false }),
    ).toBeInTheDocument();
  });

  it("names people and dates the way the cards show them", () => {
    expect(initials("Ana López")).toBe("AL");
    expect(initials("  luis ")).toBe("L");
    expect(initials("María Fernanda Rivera")).toBe("MR");
    expect(avatarColor("Ana López")).toBe(avatarColor("Ana López"));
    const now = new Date("2026-11-18T12:00:00Z");
    expect(relativeDay("2026-11-18T08:00:00Z", now)).toBe("hoy");
    expect(relativeDay("2026-11-17T12:00:00Z", now)).toBe("ayer");
    expect(relativeDay("2026-11-15T12:00:00Z", now)).toBe("hace 3 días");
    expect(relativeDay("2026-08-18T12:00:00Z", now)).toBe("hace 3 meses");
  });

  it("searches after a pause and keeps the filters in the request", async () => {
    const user = userEvent.setup();
    const api = open(CustomersPage);
    await screen.findByText("Ana López");
    await user.type(screen.getByLabelText(/Buscar/), "ana");
    await waitFor(() =>
      expect(
        api.calls.some((c) => c.url === "/customers" && c.params?.q === "ana"),
      ).toBe(true),
    );
    expect(
      customerParams({ q: " ana ", marketing: "yes", sort: "spent" }),
    ).toEqual({ sort: "spent", q: "ana", marketing: "true" });
    expect(customerParams({ q: "", marketing: "all", sort: "last" })).toEqual({
      sort: "last",
    });
  });

  it("shows one customer with their recent orders", async () => {
    open(CustomerDetailPage);
    expect(
      await screen.findByRole("heading", { name: "Ana López" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/#21/)).toBeInTheDocument();
    expect(screen.getByText("Completado")).toBeInTheDocument();
    expect(screen.getByText("L 400.00")).toBeInTheDocument();
    // Each order opens its own page.
    expect(screen.getByText(/#21/).closest("a")).toHaveAttribute(
      "href",
      "/orders/9",
    );
  });

  it("asks for analytics access", async () => {
    open(CustomersPage, { ...ME, levels: { orders: "full" } });
    expect(
      await screen.findByText(/No tienes permiso para ver los clientes/),
    ).toBeInTheDocument();
    expect(
      visibleNav(NAV_ITEMS, { orders: "full" }).map((i) => i.key),
    ).not.toContain("customers");
    expect(
      visibleNav(NAV_ITEMS, { analytics: "view" }).map((i) => i.key),
    ).toContain("customers");
  });
});
