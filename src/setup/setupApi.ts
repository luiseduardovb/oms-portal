import type { components } from "@/api/generated/schema";
import { baseApi } from "@/api/baseApi";

type Schemas = components["schemas"];
export type StoreSetup = Schemas["StoreSetup"];
export type SettingsChanges = Schemas["SettingsUpdate"];
export type PaymentMethods = Schemas["PaymentMethods"];

export const setupApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    storeSetup: build.query<StoreSetup, void>({
      query: () => ({ url: "/merchant/settings" }),
      providesTags: ["Setup"],
    }),
    updateSettings: build.mutation<StoreSetup, SettingsChanges>({
      query: (data) => ({ url: "/merchant/settings", method: "PATCH", data }),
      invalidatesTags: ["Setup", "Me"],
    }),
    renameStore: build.mutation<StoreSetup, string>({
      query: (name) => ({ url: "/merchant", method: "PATCH", data: { name } }),
      // The name is also in the session (shell, merchant switcher).
      invalidatesTags: ["Setup", "Me"],
    }),
    setPaymentMethods: build.mutation<StoreSetup, PaymentMethods>({
      query: (data) => ({
        url: "/merchant/payment-methods",
        method: "PUT",
        data,
      }),
      invalidatesTags: ["Setup"],
    }),
    changeSlug: build.mutation<StoreSetup, string>({
      query: (slug) => ({
        url: "/merchant/slug",
        method: "POST",
        data: { slug },
      }),
      invalidatesTags: ["Setup", "Me"],
    }),
  }),
});

export const {
  useStoreSetupQuery,
  useUpdateSettingsMutation,
  useRenameStoreMutation,
  useSetPaymentMethodsMutation,
  useChangeSlugMutation,
} = setupApi;
