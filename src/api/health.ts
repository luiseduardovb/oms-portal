import type { components } from "./generated/schema";
import { baseApi } from "./baseApi";

export type HealthResponse = components["schemas"]["HealthResponse"];

export const healthApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getHealth: build.query<HealthResponse, void>({
      query: () => ({ url: "/health" }),
    }),
  }),
});

export const { useGetHealthQuery } = healthApi;
