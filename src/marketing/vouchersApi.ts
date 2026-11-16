import type { components } from "@/api/generated/schema";
import { baseApi } from "@/api/baseApi";

type Schemas = components["schemas"];
export type Voucher = Schemas["VoucherOut"];
export type VoucherIn = Schemas["VoucherIn"];
export type VoucherStatus = Voucher["status"];
export type VoucherType = Voucher["type"];

export const vouchersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    vouchers: build.query<Voucher[], void>({
      query: () => ({ url: "/merchant/vouchers" }),
      transformResponse: (body: { vouchers: Voucher[] }) => body.vouchers,
      providesTags: ["Vouchers"],
    }),
    createVoucher: build.mutation<Voucher, VoucherIn>({
      query: (data) => ({ url: "/merchant/vouchers", method: "POST", data }),
      invalidatesTags: ["Vouchers"],
    }),
    replaceVoucher: build.mutation<Voucher, { id: number; body: VoucherIn }>({
      query: ({ id, body }) => ({
        url: `/merchant/vouchers/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["Vouchers"],
    }),
    toggleVoucher: build.mutation<
      Voucher,
      { id: number; isActive?: boolean; visibility?: "public" | "private" }
    >({
      query: ({ id, ...data }) => ({
        url: `/merchant/vouchers/${id}`,
        method: "PATCH",
        data,
      }),
      invalidatesTags: ["Vouchers"],
    }),
    archiveVoucher: build.mutation<void, number>({
      query: (id) => ({ url: `/merchant/vouchers/${id}`, method: "DELETE" }),
      invalidatesTags: ["Vouchers"],
    }),
  }),
});

export const {
  useVouchersQuery,
  useCreateVoucherMutation,
  useReplaceVoucherMutation,
  useToggleVoucherMutation,
  useArchiveVoucherMutation,
} = vouchersApi;
