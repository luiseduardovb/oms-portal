import type { components } from "@/api/generated/schema";
import { baseApi } from "@/api/baseApi";

type Schemas = components["schemas"];
export type Zone = Schemas["ZoneOut"];
export type ZoneBody = Schemas["ZoneIn"];
export type Coverage = Schemas["CoverageOut"];

export const deliveryApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    zones: build.query<Zone[], number>({
      query: (outletId) => ({ url: `/outlets/${outletId}/delivery-zones` }),
      providesTags: (_result, _error, outletId) => [
        { type: "Zones", id: outletId },
      ],
    }),
    createZone: build.mutation<Zone, { outletId: number; body: ZoneBody }>({
      query: ({ outletId, body }) => ({
        url: `/outlets/${outletId}/delivery-zones`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (_result, _error, { outletId }) => [
        { type: "Zones", id: outletId },
      ],
    }),
    replaceZone: build.mutation<
      Zone,
      { outletId: number; id: number; body: ZoneBody }
    >({
      query: ({ outletId, id, body }) => ({
        url: `/outlets/${outletId}/delivery-zones/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: (_result, _error, { outletId }) => [
        { type: "Zones", id: outletId },
      ],
    }),
    deleteZone: build.mutation<void, { outletId: number; id: number }>({
      query: ({ outletId, id }) => ({
        url: `/outlets/${outletId}/delivery-zones/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { outletId }) => [
        { type: "Zones", id: outletId },
      ],
    }),
    reorderZones: build.mutation<Zone[], { outletId: number; ids: number[] }>({
      query: ({ outletId, ids }) => ({
        url: `/outlets/${outletId}/delivery-zones/order`,
        method: "PUT",
        data: { ids },
      }),
      invalidatesTags: (_result, _error, { outletId }) => [
        { type: "Zones", id: outletId },
      ],
    }),
    checkAddress: build.query<
      Coverage,
      { outletId: number; latitude: number; longitude: number }
    >({
      query: ({ outletId, latitude, longitude }) => ({
        url: `/outlets/${outletId}/delivery-zones/check`,
        params: { latitude, longitude },
      }),
    }),
  }),
});

export const {
  useZonesQuery,
  useCreateZoneMutation,
  useReplaceZoneMutation,
  useDeleteZoneMutation,
  useReorderZonesMutation,
  useLazyCheckAddressQuery,
} = deliveryApi;
