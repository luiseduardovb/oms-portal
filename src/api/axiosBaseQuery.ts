import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import type { AxiosRequestConfig } from "axios";
import { toApiError, type ApiError } from "./apiError";
import { http } from "./http";

export interface ApiRequest {
  url: string;
  method?: AxiosRequestConfig["method"];
  data?: AxiosRequestConfig["data"];
  params?: AxiosRequestConfig["params"];
}

/** RTK Query base query that calls the API with axios and returns errors in
 * the API's own shape (code, message, ctx). */
export const axiosBaseQuery =
  (): BaseQueryFn<ApiRequest, unknown, ApiError> =>
  async ({ url, method = "GET", data, params }, { signal }) => {
    try {
      const response = await http.request({
        url,
        method,
        data,
        params,
        signal,
      });
      return { data: response.data };
    } catch (error) {
      return { error: toApiError(error) };
    }
  };
