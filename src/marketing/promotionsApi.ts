import type { components } from "@/api/generated/schema";
import { baseApi } from "@/api/baseApi";

type Schemas = components["schemas"];
export type Promotion = Schemas["PromotionOut"];
export type PromotionIn = Schemas["PromotionIn"];
export type PromotionStatus = Promotion["status"];

export const promotionsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    promotions: build.query<Promotion[], void>({
      query: () => ({ url: "/merchant/promotions" }),
      transformResponse: (body: { promotions: Promotion[] }) => body.promotions,
      providesTags: ["Promotions"],
    }),
    createPromotion: build.mutation<Promotion, PromotionIn>({
      query: (data) => ({
        url: "/merchant/promotions",
        method: "POST",
        data,
      }),
      invalidatesTags: ["Promotions"],
    }),
    replacePromotion: build.mutation<
      Promotion,
      { id: number; body: PromotionIn }
    >({
      query: ({ id, body }) => ({
        url: `/merchant/promotions/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["Promotions"],
    }),
    togglePromotion: build.mutation<
      Promotion,
      { id: number; isActive: boolean }
    >({
      query: ({ id, ...data }) => ({
        url: `/merchant/promotions/${id}`,
        method: "PATCH",
        data,
      }),
      invalidatesTags: ["Promotions"],
    }),
    archivePromotion: build.mutation<void, number>({
      query: (id) => ({
        url: `/merchant/promotions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Promotions"],
    }),
  }),
});

export const {
  usePromotionsQuery,
  useCreatePromotionMutation,
  useReplacePromotionMutation,
  useTogglePromotionMutation,
  useArchivePromotionMutation,
} = promotionsApi;
