import type { components } from "@/api/generated/schema";
import { baseApi } from "@/api/baseApi";
import { http } from "@/api/http";
import { filterParams, type Filters } from "./analyticsApi";

type Schemas = components["schemas"];
export type FeedbackRow = Schemas["FeedbackRow"];
export type FeedbackSummary = Schemas["FeedbackSummary"];

type Scope = Pick<Filters, "from" | "to" | "outletId">;

export interface FeedbackArgs extends Scope {
  rating: number | null;
  page: number;
  itemsPerPage: number;
}

export const feedbackApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    feedbackSummary: build.query<FeedbackSummary, Scope>({
      query: (a) => ({
        url: "/feedback/summary",
        params: filterParams(a),
      }),
    }),
    feedbackList: build.query<
      { totalCount: number; totalPages: number; results: FeedbackRow[] },
      FeedbackArgs
    >({
      query: (a) => ({
        url: "/feedback",
        params: {
          ...filterParams(a),
          ...(a.rating ? { rating: a.rating } : {}),
          page: a.page,
          itemsPerPage: a.itemsPerPage,
        },
      }),
    }),
  }),
});

export const { useFeedbackSummaryQuery, useFeedbackListQuery } = feedbackApi;

export async function downloadFeedback(
  a: Scope & { rating: number | null },
): Promise<void> {
  const response = await http.get<Blob>("/feedback/export", {
    params: { ...filterParams(a), ...(a.rating ? { rating: a.rating } : {}) },
    responseType: "blob",
  });
  const href = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = href;
  link.download = "comentarios.csv";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}
