import type { components } from "@/api/generated/schema";
import { baseApi } from "@/api/baseApi";
import { http } from "@/api/http";

type Schemas = components["schemas"];
export type CustomerRow = Schemas["CustomerRow"];
export type CustomerDetail = Schemas["CustomerDetail"];
export type CustomerSummary = Schemas["CustomerSummary"];

export type CustomerSort = "last" | "spent" | "orders" | "name";

export interface CustomerFilters {
  q: string;
  marketing: "all" | "yes" | "no";
  sort: CustomerSort;
  page: number;
  itemsPerPage: number;
}

export function customerParams(
  filters: Pick<CustomerFilters, "q" | "marketing" | "sort">,
): Record<string, string> {
  const params: Record<string, string> = { sort: filters.sort };
  if (filters.q.trim()) params.q = filters.q.trim();
  if (filters.marketing !== "all") {
    params.marketing = filters.marketing === "yes" ? "true" : "false";
  }
  return params;
}

export const customersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    customers: build.query<
      {
        totalCount: number;
        totalPages: number;
        results: CustomerRow[];
      },
      CustomerFilters
    >({
      query: (filters) => ({
        url: "/customers",
        params: {
          ...customerParams(filters),
          page: filters.page,
          itemsPerPage: filters.itemsPerPage,
        },
      }),
      providesTags: ["Customers"],
    }),
    customerSummary: build.query<CustomerSummary, void>({
      query: () => ({ url: "/customers/summary" }),
      providesTags: ["Customers"],
    }),
    customer: build.query<CustomerDetail, number>({
      query: (id) => ({ url: `/customers/${id}` }),
      providesTags: (_result, _error, id) => [{ type: "Customers", id }],
    }),
  }),
});

export const { useCustomersQuery, useCustomerQuery, useCustomerSummaryQuery } =
  customersApi;

/** Downloads the filtered list as a CSV file. */
export async function downloadCustomers(
  filters: Pick<CustomerFilters, "q" | "marketing" | "sort">,
): Promise<void> {
  const response = await http.get<Blob>("/customers/export", {
    params: customerParams(filters),
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = "clientes.csv";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
