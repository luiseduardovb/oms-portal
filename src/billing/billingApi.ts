import type { components } from "@/api/generated/schema";
import { baseApi } from "@/api/baseApi";

type Schemas = components["schemas"];
export type MyBilling = Schemas["MyBilling"];
export type PlanFeature = Schemas["PlanFeature"];
export type InvoiceOut = Schemas["InvoiceOut"];
export type BillingEvent = Schemas["BillingEvent"];

export const billingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    myBilling: build.query<MyBilling, void>({
      query: () => ({ url: "/billing" }),
    }),
  }),
});

export const { useMyBillingQuery } = billingApi;
