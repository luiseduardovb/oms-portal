import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { http } from "@/api/http";
import { sessionStarted } from "@/auth/sessionSlice";
import { setAccessToken } from "@/auth/tokenStore";
import { NAV_ITEMS, visibleNav } from "@/components/shell/nav";
import { BillingPage } from "@/billing/BillingPage";
import { addDays, daysUntil } from "@/billing/dates";
import { makeStore } from "@/store";
import { fakeApi, ME } from "./fakeApi";
import { renderWithProviders } from "./render";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/billing",
}));

const OWNER = { ...ME, levels: { ...ME.levels, billing: "full" } };
const MANAGER = { ...ME, levels: { ...ME.levels, billing: "none" } };

const DATA = {
  subscription: {
    planId: 2,
    planTitle: "Básico",
    planKind: "paid",
    cycle: "monthly",
    currencyCode: "HNL",
    amount: "499.00",
    status: "past_due",
    startedOn: "2026-10-01",
    dueOn: "2026-11-15",
  },
  plan: {
    title: "Básico",
    caption: "Ideal para un restaurante",
    description: null,
    hardLimit: true,
    features: [
      {
        key: "outlets",
        label: "Sucursales",
        module: "branches",
        moduleLabel: "Sucursales",
        kind: "count",
        quantity: 2,
      },
      {
        key: "orders_per_month",
        label: "Pedidos por mes",
        module: "orders",
        moduleLabel: "Pedidos",
        kind: "count",
        quantity: null,
      },
      {
        key: "analytics_full",
        label: "Analíticas completas",
        module: "analytics",
        moduleLabel: "Analíticas",
        kind: "toggle",
        quantity: null,
      },
    ],
  },
  addons: [],
  invoices: [
    {
      id: 3,
      number: "F-000003",
      status: "open",
      currencyCode: "HNL",
      amount: "499.00",
      dueOn: "2026-11-15",
      periodFrom: "2026-11-15",
      periodTo: "2026-12-15",
      description: "Básico",
      paidOn: null,
      paymentNote: null,
      createdAt: "2026-11-08T12:00:00Z",
    },
  ],
  events: [
    {
      id: 2,
      kind: "status_changed",
      detail: { status: "past_due" },
      source: "system",
      actorName: null,
      createdAt: "2026-11-16T06:00:00Z",
    },
    {
      id: 1,
      kind: "plan_assigned",
      detail: { plan: "Básico", cycle: "monthly" },
      source: "operator",
      actorName: null,
      createdAt: "2026-10-01T15:00:00Z",
    },
  ],
  paymentLink: "https://pay.example.com/basico",
};

function open(me: object) {
  const store = makeStore();
  store.dispatch(sessionStarted());
  setAccessToken("token");
  fakeApi(http, (call) => {
    if (call.url === "/me") return { status: 200, data: me };
    if (call.url === "/billing") return { status: 200, data: DATA };
    return { status: 404 };
  });
  renderWithProviders(<BillingPage />, store);
}

describe("billing page", () => {
  it("shows the plan, what it includes, a late warning and a pay link", async () => {
    open(OWNER);
    expect(await screen.findByText("Ideal para un restaurante")).toBeVisible();
    expect(screen.getByText("Vencida")).toBeInTheDocument();
    expect(
      screen.getByText(/tu tienda saldrá de línea el 20 de noviembre de 2026/),
    ).toBeInTheDocument();
    // Counts say how many; a switch just lists the feature.
    expect(screen.getByText(/Sucursales · Hasta 2/)).toBeInTheDocument();
    expect(screen.getByText(/Pedidos por mes · Ilimitado/)).toBeInTheDocument();
    expect(screen.getByText("Analíticas completas")).toBeInTheDocument();
    expect(screen.getByText("F-000003")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pagar" })).toHaveAttribute(
      "href",
      "https://pay.example.com/basico",
    );
  });

  it("lists what happened to the plan, newest first", async () => {
    open(OWNER);
    expect(await screen.findByText("Historial")).toBeVisible();
    expect(screen.getByText("Plan Básico asignado")).toBeInTheDocument();
    expect(screen.getByText("Pago vencido")).toBeInTheDocument();
    expect(screen.getByText(/automático/)).toBeInTheDocument();
    expect(
      screen.getByText(/por el equipo de la plataforma/),
    ).toBeInTheDocument();
  });

  it("tells a role without billing access that it is owner-only", async () => {
    open(MANAGER);
    expect(
      await screen.findByText("Solo los dueños pueden ver la facturación."),
    ).toBeInTheDocument();
  });

  it("is in the sidebar only for roles with billing access", () => {
    const keys = (levels: Record<string, string>) =>
      visibleNav(NAV_ITEMS, levels).map((i) => i.key);
    expect(keys({ billing: "view" })).toContain("billing");
    expect(keys({ billing: "none", orders: "full" })).not.toContain("billing");
  });

  it("counts days to a date", () => {
    const now = new Date(2026, 10, 19, 23, 30);
    expect(daysUntil("2026-11-19", now)).toBe(0);
    expect(daysUntil("2026-11-22", now)).toBe(3);
    expect(daysUntil("2026-11-15", now)).toBe(-4);
    expect(addDays("2026-11-15", 5).getDate()).toBe(20);
  });
});
