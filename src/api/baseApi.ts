import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "./axiosBaseQuery";

/** The single RTK Query slice. Each feature adds its endpoints with
 * `baseApi.injectEndpoints(...)` in its own file. */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: axiosBaseQuery(),
  tagTypes: [],
  endpoints: () => ({}),
});
