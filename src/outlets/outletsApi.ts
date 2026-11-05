import type { components } from "@/api/generated/schema";
import { baseApi } from "@/api/baseApi";

type Schemas = components["schemas"];
export type OutletSummary = Schemas["OutletSummary"];
export type OutletDetail = Schemas["OutletDetail"];
export type OutletCreate = Schemas["OutletCreate"];
export type OutletChanges = Schemas["OutletUpdate"];
export type OpeningInterval = Schemas["OpeningInterval"];
export type HourException = Schemas["HourException"];
export type AlertContact = Schemas["AlertContact"];

export const outletsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    outlets: build.query<OutletSummary[], boolean | void>({
      query: (includeArchived) => ({
        url: "/outlets",
        params: includeArchived ? { includeArchived: true } : undefined,
      }),
      providesTags: ["Outlets"],
    }),
    outlet: build.query<OutletDetail, number>({
      query: (id) => ({ url: `/outlets/${id}` }),
      providesTags: (_result, _error, id) => [{ type: "Outlet", id }],
    }),
    createOutlet: build.mutation<OutletDetail, OutletCreate>({
      query: (data) => ({ url: "/outlets", method: "POST", data }),
      invalidatesTags: ["Outlets"],
    }),
    updateOutlet: build.mutation<
      OutletDetail,
      { id: number; changes: OutletChanges }
    >({
      query: ({ id, changes }) => ({
        url: `/outlets/${id}`,
        method: "PATCH",
        data: changes,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        "Outlets",
        { type: "Outlet", id },
      ],
    }),
    archiveOutlet: build.mutation<OutletDetail, number>({
      query: (id) => ({ url: `/outlets/${id}/archive`, method: "POST" }),
      // Archiving also takes the outlet away from team members.
      invalidatesTags: (_result, _error, id) => [
        "Outlets",
        "Members",
        { type: "Outlet", id },
      ],
    }),
    restoreOutlet: build.mutation<OutletDetail, number>({
      query: (id) => ({ url: `/outlets/${id}/restore`, method: "POST" }),
      invalidatesTags: (_result, _error, id) => [
        "Outlets",
        { type: "Outlet", id },
      ],
    }),
    replaceHours: build.mutation<
      OutletDetail,
      { id: number; hours: OpeningInterval[] }
    >({
      query: ({ id, hours }) => ({
        url: `/outlets/${id}/hours`,
        method: "PUT",
        data: { hours },
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Outlet", id }],
    }),
    replaceExceptions: build.mutation<
      OutletDetail,
      { id: number; exceptions: HourException[] }
    >({
      query: ({ id, exceptions }) => ({
        url: `/outlets/${id}/hour-exceptions`,
        method: "PUT",
        data: { exceptions },
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Outlet", id }],
    }),
    replaceContacts: build.mutation<
      OutletDetail,
      { id: number; alertContacts: AlertContact[] }
    >({
      query: ({ id, alertContacts }) => ({
        url: `/outlets/${id}/alert-contacts`,
        method: "PUT",
        data: { alertContacts },
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Outlet", id }],
    }),
  }),
});

export const {
  useOutletsQuery,
  useOutletQuery,
  useCreateOutletMutation,
  useUpdateOutletMutation,
  useArchiveOutletMutation,
  useRestoreOutletMutation,
  useReplaceHoursMutation,
  useReplaceExceptionsMutation,
  useReplaceContactsMutation,
} = outletsApi;
