import type { components } from "@/api/generated/schema";
import { baseApi } from "@/api/baseApi";
import { http } from "@/api/http";

type Schemas = components["schemas"];
export type SalesAnalytics = Schemas["SalesAnalytics"];
export type SalesPoint = Schemas["SalesPoint"];
export type Behavior = Schemas["Behavior"];
export type ReportDay = Schemas["ReportDay"];
export type ReportOrder = Schemas["ReportOrder"];
export type SalesReportDays = Schemas["SalesReportDays"];

export type BestSelling = Schemas["BestSelling"];
export type BestProduct = Schemas["BestProduct"];
export type BranchRow = Schemas["BranchRow"];
export type AreaRow = Schemas["AreaRow"];
export type MapCell = Schemas["MapCell"];

export type Bucket = "day" | "month";
export type Tax = "with" | "without";
export type BehaviorKind = "fulfillment" | "payment" | "customers";
export type BehaviorMetric = "sales" | "orders" | "average_order" | "customers";

export interface Filters {
  from: string;
  to: string;
  outletId: number | null;
  tax: Tax;
  bucket: Bucket;
}

/** The query string the API takes for the shared filters. */
export function filterParams(
  f: Pick<Filters, "from" | "to" | "outletId">,
): Record<string, string | number> {
  const params: Record<string, string | number> = { from: f.from, to: f.to };
  if (f.outletId) params.outletId = f.outletId;
  return params;
}

export interface SalesArgs extends Filters {
  previous: boolean;
  year: boolean;
}

export interface BehaviorArgs extends Filters {
  kind: BehaviorKind;
  metric: BehaviorMetric;
}

export interface OrdersArgs extends Pick<Filters, "from" | "to" | "outletId"> {
  page: number;
  itemsPerPage: number;
}

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    salesAnalytics: build.query<SalesAnalytics, SalesArgs>({
      query: (a) => ({
        url: "/analytics/sales",
        params: {
          ...filterParams(a),
          bucket: a.bucket,
          tax: a.tax,
          previous: a.previous,
          year: a.year,
        },
      }),
    }),
    behavior: build.query<Behavior, BehaviorArgs>({
      query: (a) => ({
        url: "/analytics/behavior",
        params: {
          ...filterParams(a),
          kind: a.kind,
          metric: a.metric,
          bucket: a.bucket,
          tax: a.tax,
        },
      }),
    }),
    reportDays: build.query<
      SalesReportDays,
      Pick<Filters, "from" | "to" | "outletId">
    >({
      query: (a) => ({
        url: "/analytics/sales-report/days",
        params: filterParams(a),
      }),
    }),
    reportOrders: build.query<
      {
        totalCount: number;
        totalPages: number;
        results: ReportOrder[];
      },
      OrdersArgs
    >({
      query: (a) => ({
        url: "/analytics/sales-report/orders",
        params: {
          ...filterParams(a),
          page: a.page,
          itemsPerPage: a.itemsPerPage,
        },
      }),
    }),
    bestSelling: build.query<
      BestSelling,
      Pick<Filters, "from" | "to" | "outletId">
    >({
      query: (a) => ({
        url: "/analytics/best-selling",
        params: filterParams(a),
      }),
    }),
    branches: build.query<
      BranchRow[],
      Pick<Filters, "from" | "to" | "outletId" | "tax">
    >({
      query: (a) => ({
        url: "/analytics/geography/branches",
        params: { ...filterParams(a), tax: a.tax },
      }),
    }),
    areas: build.query<
      AreaRow[],
      Pick<Filters, "from" | "to" | "outletId" | "tax">
    >({
      query: (a) => ({
        url: "/analytics/geography/areas",
        params: { ...filterParams(a), tax: a.tax },
      }),
    }),
    mapCells: build.query<
      MapCell[],
      Pick<Filters, "from" | "to" | "outletId" | "tax">
    >({
      query: (a) => ({
        url: "/analytics/geography/map",
        params: { ...filterParams(a), tax: a.tax },
      }),
    }),
  }),
});

export const {
  useMapCellsQuery,
  useBestSellingQuery,
  useBranchesQuery,
  useAreasQuery,
  useSalesAnalyticsQuery,
  useBehaviorQuery,
  useReportDaysQuery,
  useReportOrdersQuery,
} = analyticsApi;

async function download(
  url: string,
  params: Record<string, string | number | boolean>,
  filename: string,
): Promise<void> {
  const response = await http.get<Blob>(url, {
    params,
    responseType: "blob",
  });
  const href = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

export function downloadSales(a: Filters): Promise<void> {
  return download(
    "/analytics/sales/export",
    { ...filterParams(a), bucket: a.bucket, tax: a.tax },
    "ventas.csv",
  );
}

export function downloadBehavior(a: BehaviorArgs): Promise<void> {
  return download(
    "/analytics/behavior/export",
    {
      ...filterParams(a),
      kind: a.kind,
      metric: a.metric,
      bucket: a.bucket,
      tax: a.tax,
    },
    "comportamiento.csv",
  );
}

export function downloadReport(
  f: Pick<Filters, "from" | "to" | "outletId">,
  group: "day" | "order",
): Promise<void> {
  return download(
    "/analytics/sales-report/export",
    { ...filterParams(f), group },
    group === "day" ? "reporte-por-dia.csv" : "reporte-por-pedido.csv",
  );
}

export function downloadGeography(
  f: Pick<Filters, "from" | "to" | "outletId" | "tax">,
  level: "branches" | "areas",
): Promise<void> {
  return download(
    "/analytics/geography/export",
    { ...filterParams(f), tax: f.tax, level },
    level === "branches" ? "sucursales.csv" : "areas-de-entrega.csv",
  );
}
