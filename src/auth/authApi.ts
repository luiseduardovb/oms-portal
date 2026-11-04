import type { components } from "@/api/generated/schema";
import { baseApi } from "@/api/baseApi";
import { CSRF_HEADERS, type TokenResponse } from "./refresh";
import { sessionEnded, sessionStarted } from "./sessionSlice";
import { setAccessToken } from "./tokenStore";

export type Me = components["schemas"]["MeResponse"];
export type Membership = components["schemas"]["MembershipOut"];
export type LoginInput = components["schemas"]["LoginRequest"];
type SwitchResponse = components["schemas"]["SwitchMerchantResponse"];

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<TokenResponse, LoginInput>({
      query: (data) => ({ url: "/auth/login", method: "POST", data }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          setAccessToken(data.accessToken);
          dispatch(sessionStarted());
        } catch {
          // The error is in the mutation state; the form shows it.
        }
      },
    }),
    me: build.query<Me, void>({
      query: () => ({ url: "/me" }),
      providesTags: ["Me"],
    }),
    switchMerchant: build.mutation<SwitchResponse, number>({
      query: (merchantId) => ({
        url: "/auth/switch-merchant",
        method: "POST",
        data: { merchantId },
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          setAccessToken(data.accessToken);
          // Everything cached belongs to the old merchant.
          dispatch(baseApi.util.resetApiState());
        } catch {
          // The error is in the mutation state.
        }
      },
    }),
    logout: build.mutation<void, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
        headers: CSRF_HEADERS,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch {
          // The session ends locally even if the server could not be reached.
        }
        setAccessToken(null);
        dispatch(sessionEnded());
        dispatch(baseApi.util.resetApiState());
      },
    }),
  }),
});

export const {
  useLoginMutation,
  useMeQuery,
  useSwitchMerchantMutation,
  useLogoutMutation,
} = authApi;
