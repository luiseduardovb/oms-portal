import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { http } from "@/api/http";
import { sessionStarted } from "@/auth/sessionSlice";
import { setAccessToken } from "@/auth/tokenStore";
import { BehaviorPage } from "@/analytics/BehaviorPage";
import { BestSellingPage } from "@/analytics/BestSellingPage";
import { FeedbackPage } from "@/analytics/FeedbackPage";
import { GeographyPage } from "@/analytics/GeographyPage";
import { level } from "@/analytics/AreaMap";
import { ReportPage } from "@/analytics/ReportPage";
import { SalesPage } from "@/analytics/SalesPage";
import {
  filtersToQuery,
  formatChange,
  matchPreset,
  parseFilters,
  presetRange,
} from "@/analytics/range";
import { makeStore } from "@/store";
import { fakeApi, ME } from "./fakeApi";
import { renderWithProviders } from "./render";

let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/analytics/sales",
  useSearchParams: () => new URLSearchParams(search),
}));
// The charts draw to a canvas of real size; the tests look at the numbers.
vi.mock("@mui/x-charts/LineChart", () => ({
  LineChart: ({ series }: { series: { label: string }[] }) => (
    <div data-testid="line">{series.map((s) => s.label).join("|")}</div>
  ),
}));
vi.mock("@mui/x-charts/BarChart", () => ({
  BarChart: ({ series }: { series: { label: string }[] }) => (
    <div data-testid="bars">{series.map((s) => s.label).join("|")}</div>
  ),
}));

const MANAGER = { ...ME, levels: { ...ME.levels, analytics: "view" } };

const KPI = (value: string, change: number | null) => ({
  value,
  previous: "100.00",
  previousYear: "0.00",
  change,
  changeYear: null,
});
const POINT = {
  date: "2026-11-17",
  sales: "420.00",
  averageOrder: "210.00",
  orders: 2,
  customers: 1,
  delivery: "30.00",
};
const SALES = {
  bucket: "day",
  tax: "with",
  period: { dateFrom: "2026-10-20", dateTo: "2026-11-18" },
  previousPeriod: { dateFrom: "2026-09-20", dateTo: "2026-10-19" },
  previousYearPeriod: { dateFrom: "2025-10-20", dateTo: "2025-11-18" },
  kpis: {
    sales: KPI("420.00", 320),
    averageOrder: KPI("210.00", -5.5),
    orders: { ...KPI("2", 100), value: 2, previous: 1, previousYear: 0 },
    customers: { ...KPI("1", null), value: 1, previous: 1, previousYear: 0 },
    delivery: KPI("30.00", null),
  },
  series: [POINT],
  previous: null,
  previousYear: null,
};

function open(View: () => ReactElement | null, me: object = MANAGER) {
  const store = makeStore();
  store.dispatch(sessionStarted());
  setAccessToken("token");
  const api = fakeApi(http, (call) => {
    if (call.url === "/me") return { status: 200, data: me };
    if (call.url === "/outlets") return { status: 200, data: [] };
    if (call.url === "/analytics/sales") return { status: 200, data: SALES };
    if (call.url === "/analytics/behavior") {
      return {
        status: 200,
        data: {
          kind: call.params?.kind,
          metric: call.params?.metric,
          bucket: "day",
          tax: "with",
          keys: ["delivery", "pickup"],
          series: [
            {
              date: "2026-11-17",
              values: { delivery: "300.00", pickup: "120.00" },
            },
          ],
          totals: [
            {
              key: "delivery",
              orders: 1,
              customers: 1,
              sales: "300.00",
              averageOrder: "300.00",
            },
            {
              key: "pickup",
              orders: 1,
              customers: 1,
              sales: "120.00",
              averageOrder: "120.00",
            },
          ],
        },
      };
    }
    if (call.url === "/analytics/best-selling") {
      return {
        status: 200,
        data: {
          products: [
            {
              rank: 1,
              productId: 5,
              name: "Baleada sencilla",
              imageUrl: null,
              sales: "840.00",
              orders: 7,
              quantity: 12,
            },
          ],
          categories: [
            {
              rank: 1,
              categoryId: 2,
              name: "Baleadas",
              sales: "840.00",
              orders: 7,
              quantity: 12,
            },
          ],
        },
      };
    }
    if (call.url === "/analytics/geography/branches") {
      return {
        status: 200,
        data: [
          {
            outletId: 7,
            name: "Centro",
            sales: "900.00",
            averageOrder: "150.00",
            deliveryOrders: 4,
            pickupOrders: 2,
            orders: 6,
            customers: 5,
          },
        ],
      };
    }
    if (call.url === "/analytics/geography/areas") {
      return {
        status: 200,
        data: [
          {
            name: null,
            sales: "300.00",
            averageOrder: "100.00",
            orders: 3,
            customers: 2,
            lat: null,
            lng: null,
          },
        ],
      };
    }
    if (call.url === "/feedback/summary") {
      return {
        status: 200,
        data: {
          count: 3,
          average: 3.67,
          stars: [5, 4, 3, 2, 1].map((rating) => ({
            rating,
            count: rating === 5 ? 2 : rating === 1 ? 1 : 0,
          })),
        },
      };
    }
    if (call.url === "/feedback") {
      return {
        status: 200,
        data: {
          totalCount: 1,
          totalPages: 1,
          results: [
            {
              id: 1,
              rating: 1,
              comment: "Llegó frío",
              customerName: "Ana",
              customerPhone: null,
              outletId: 7,
              outletName: "Centro",
              orderId: 9,
              orderNumber: 12,
              createdAt: "2026-11-17T18:00:00Z",
            },
          ],
        },
      };
    }
    if (call.url === "/analytics/sales-report/days") {
      const row = {
        orders: 2,
        items: 4,
        subtotal: "400.00",
        discounts: "10.00",
        tax: "55.00",
        delivery: "30.00",
        total: "450.00",
      };
      return {
        status: 200,
        data: { totals: row, rows: [{ date: "2026-11-17", ...row }] },
      };
    }
    return { status: 404 };
  });
  renderWithProviders(<View />, store);
  return api;
}

describe("analytics helpers", () => {
  const today = new Date(2026, 10, 18);
  it("computes the period presets", () => {
    expect(presetRange("today", today)).toEqual({
      from: "2026-11-18",
      to: "2026-11-18",
    });
    expect(presetRange("last7", today).from).toBe("2026-11-12");
    expect(presetRange("last30", today).from).toBe("2026-10-20");
    expect(presetRange("thisMonth", today).from).toBe("2026-11-01");
    expect(presetRange("lastMonth", today)).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(matchPreset("2026-10-20", "2026-11-18", today)).toBe("last30");
    expect(matchPreset("2026-10-21", "2026-11-18", today)).toBeNull();
  });

  it("reads the filters from the address with safe defaults", () => {
    const f = parseFilters(new URLSearchParams("from=oops&tax=without"), today);
    expect(f.from).toBe("2026-10-20");
    expect(f.tax).toBe("without");
    expect(f.bucket).toBe("day");
    expect(f.outletId).toBeNull();
    const g = parseFilters(
      new URLSearchParams(
        "from=2026-11-01&to=2026-11-05&outletId=7&bucket=month",
      ),
      today,
    );
    expect(g).toMatchObject({
      outletId: 7,
      bucket: "month",
      from: "2026-11-01",
    });
    expect(filtersToQuery(g)).toContain("outletId=7");
    // A backwards range falls back to the default.
    expect(
      parseFilters(new URLSearchParams("from=2026-11-05&to=2026-11-01"), today)
        .to,
    ).toBe("2026-11-18");
  });

  it("writes a change as a signed percent", () => {
    expect(formatChange(null)).toBeNull();
    expect(formatChange(12.5)).toMatch(/^\+12[.,]5 %$/);
    expect(formatChange(-3)).toBe("-3 %");
  });
});

describe("analytics pages", () => {
  it("shows the four numbers with their change and the delivery apart", async () => {
    search = "";
    const api = open(SalesPage);
    expect((await screen.findAllByText("L 420.00")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("+320 %").length).toBeGreaterThan(0);
    expect(screen.getByText(/^-5[.,]5 %$/)).toBeInTheDocument();
    expect(screen.getByText("Envíos")).toBeInTheDocument();
    expect(screen.getAllByText("L 30.00").length).toBeGreaterThan(0);
    expect(screen.getByTestId("line")).toHaveTextContent("Período elegido");
    expect(
      screen.getByRole("link", { name: "Ver reporte completo" }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining("/analytics/sales/breakdown?"),
    );
    const call = api.calls.find((c) => c.url === "/analytics/sales");
    expect(call?.params).toMatchObject({ tax: "with", bucket: "day" });
  });

  it("asks for the comparison only when it is switched on and takes the tax from the address", async () => {
    search = "tax=without";
    const user = userEvent.setup();
    const api = open(SalesPage);
    await screen.findAllByText("L 420.00");
    await user.click(screen.getByRole("button", { name: "Período anterior" }));
    await waitFor(() =>
      expect(
        api.calls.some(
          (c) =>
            c.url === "/analytics/sales" &&
            c.params?.previous === true &&
            c.params?.tax === "without",
        ),
      ).toBe(true),
    );
    expect((await screen.findByTestId("line")).textContent).toContain(
      "Período anterior",
    );
  });

  it("splits by delivery and pickup", async () => {
    search = "";
    open(BehaviorPage);
    expect(await screen.findByTestId("bars")).toHaveTextContent(
      "Entrega|Recoger",
    );
    expect(screen.getAllByText("L 300.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Recoger").length).toBeGreaterThan(0);
  });

  it("lists the sales report by day with its totals", async () => {
    search = "";
    open(ReportPage);
    expect(await screen.findAllByText("L 450.00")).toHaveLength(2);
    expect(screen.getAllByText("Total").length).toBeGreaterThan(1);
  });

  it("closes the page to people without analytics", async () => {
    search = "";
    open(SalesPage, ME);
    expect(
      await screen.findByText("No tienes permiso para ver las analíticas."),
    ).toBeInTheDocument();
  });

  it("ranks the best sellers with how many orders and units", async () => {
    search = "";
    open(BestSellingPage);
    expect(await screen.findByText("Baleada sencilla")).toBeInTheDocument();
    expect(screen.getAllByText(/7 pedidos · 12 vendidos/)).toHaveLength(2);
    expect(screen.getByText(/1\. Baleadas/)).toBeInTheDocument();
  });

  it("lists branches, and a branch opens its delivery areas", async () => {
    search = "outletId=7";
    const first = open(GeographyPage);
    expect(
      await screen.findByText("Áreas de entrega · Centro"),
    ).toBeInTheDocument();
    // The branch list is never narrowed by the branch picked below.
    expect(
      first.calls.find((c) => c.url === "/analytics/geography/branches")?.params
        ?.outletId,
    ).toBeUndefined();
    expect(screen.getByText("Sin zona")).toBeInTheDocument();
  });

  it("steps the map shades by how an area sold against the best", () => {
    expect([0, 25, 26, 50, 51, 75, 76, 100].map(level)).toEqual([
      0, 0, 1, 1, 2, 2, 3, 3,
    ]);
  });

  it("shows the feedback summary and each comment with its order", async () => {
    search = "";
    const user = userEvent.setup();
    const api = open(FeedbackPage);
    expect(await screen.findByText("Llegó frío")).toBeInTheDocument();
    expect(screen.getByText("3 comentarios")).toBeInTheDocument();
    expect(screen.getByText("Pedido #12")).toBeInTheDocument();
    expect(screen.getByText("Centro")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "1★" }));
    await waitFor(() =>
      expect(
        api.calls.some((c) => c.url === "/feedback" && c.params?.rating === 1),
      ).toBe(true),
    );
  });
});
