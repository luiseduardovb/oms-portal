import { baseApi } from "@/api/baseApi";
import type { components } from "@/api/generated/schema";

type Schemas = components["schemas"];
export type OrderSummary = Schemas["OrderSummaryOut"];
export type OrderDetail = Schemas["OrderOut"];
export type OrderCounts = Schemas["OrderCountsOut"];
export type OrderLine = Schemas["OrderLineOut"];
export type OrderHistory = Schemas["OrderHistoryOut"];
export type CancelReason = Schemas["CancelBody"]["reasonCode"];
export type EventsPage = Schemas["EventsOut"];
export type OrderEvent = Schemas["EventOut"];
export type Ticket = Schemas["TicketOut"];

export interface OrderFilters {
  status?: string[];
  outletId?: number;
  dateFrom?: string;
  dateTo?: string;
  openAnyDate?: boolean;
  q?: string;
}

export interface OrderListArgs extends OrderFilters {
  page: number;
  itemsPerPage: number;
}

export interface Paged<T> {
  page: number;
  itemsPerPage: number;
  totalPages: number;
  totalCount: number;
  results: T[];
}

/** Query-string for the list. Repeated `status` values go out as
 * `status=a&status=b` (what FastAPI expects; axios would send `status[]`). */
export function listParams(filters: OrderFilters & Partial<OrderListArgs>) {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.itemsPerPage) {
    params.set("itemsPerPage", String(filters.itemsPerPage));
  }
  for (const status of filters.status ?? []) params.append("status", status);
  if (filters.outletId) params.set("outletId", String(filters.outletId));
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.openAnyDate) params.set("openAnyDate", "true");
  if (filters.q) params.set("q", filters.q);
  return params;
}

export type OrderAction = "accept" | "ready" | "dispatch" | "complete";

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    orders: build.query<Paged<OrderSummary>, OrderListArgs>({
      query: (args) => ({ url: "/orders", params: listParams(args) }),
      providesTags: ["Orders"],
    }),
    orderCounts: build.query<OrderCounts, OrderFilters>({
      query: (filters) => ({
        url: "/orders/counts",
        params: listParams({ ...filters, status: undefined }),
      }),
      providesTags: ["OrderCounts"],
    }),
    order: build.query<OrderDetail, number>({
      query: (id) => ({ url: `/orders/${id}` }),
      providesTags: (_r, _e, id) => [{ type: "Order", id }],
    }),
    orderAction: build.mutation<
      OrderDetail,
      {
        id: number;
        action: OrderAction;
        version?: number;
        driverName?: string;
        driverPhone?: string;
      }
    >({
      query: ({ id, action, version, driverName, driverPhone }) => ({
        url: `/orders/${id}/${action}`,
        method: "POST",
        data: { version, driverName, driverPhone },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        "Orders",
        "OrderCounts",
        { type: "Order", id },
      ],
    }),
    cancelOrder: build.mutation<
      OrderDetail,
      { id: number; version?: number; reasonCode: CancelReason; note?: string }
    >({
      query: ({ id, version, reasonCode, note }) => ({
        url: `/orders/${id}/cancel`,
        method: "POST",
        data: { version, reasonCode, note: note || undefined },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        "Orders",
        "OrderCounts",
        { type: "Order", id },
      ],
    }),
    eventTicket: build.mutation<Ticket, void>({
      query: () => ({ url: "/events/ticket", method: "POST" }),
    }),
    eventsAfter: build.mutation<EventsPage, { after: number; limit?: number }>({
      query: ({ after, limit }) => ({
        url: "/events",
        params: { after, limit },
      }),
    }),
  }),
});

export const {
  useOrdersQuery,
  useOrderCountsQuery,
  useOrderQuery,
  useOrderActionMutation,
  useCancelOrderMutation,
  useEventTicketMutation,
  useEventsAfterMutation,
} = ordersApi;
