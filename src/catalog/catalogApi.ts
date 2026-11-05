import type { components } from "@/api/generated/schema";
import { baseApi } from "@/api/baseApi";

type Schemas = components["schemas"];
export type Product = Schemas["ProductOut"];
export type ProductOutlet = Schemas["ProductOutletOut"];
export type ProductPage = Schemas["Paginated_ProductOut_"];
export type ProductCreate = Schemas["ProductCreate"];
export type ProductChanges = Schemas["ProductUpdate"];
export type Category = Schemas["CategoryOut"];
export type StockChange = Schemas["StockBody"];
export type StockMovement = Schemas["MovementOut"];
export type MovementPage = Schemas["Paginated_MovementOut_"];
export type Media = Schemas["MediaOut"];
export type UploadCreated = Schemas["UploadCreated"];

export interface ProductFilters {
  page: number;
  itemsPerPage: number;
  search?: string;
  categoryId?: number;
  outletId?: number;
  includeArchived?: boolean;
}

export const catalogApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    products: build.query<ProductPage, ProductFilters>({
      query: ({ includeArchived, ...rest }) => ({
        url: "/products",
        params: { ...rest, ...(includeArchived ? { includeArchived } : {}) },
      }),
      providesTags: ["Products"],
    }),
    product: build.query<Product, number>({
      query: (id) => ({ url: `/products/${id}` }),
      providesTags: (_result, _error, id) => [{ type: "Product", id }],
    }),
    createProduct: build.mutation<Product, ProductCreate>({
      query: (data) => ({ url: "/products", method: "POST", data }),
      invalidatesTags: ["Products"],
    }),
    updateProduct: build.mutation<
      Product,
      { id: number; changes: ProductChanges }
    >({
      query: ({ id, changes }) => ({
        url: `/products/${id}`,
        method: "PATCH",
        data: changes,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        "Products",
        { type: "Product", id },
      ],
    }),
    archiveProduct: build.mutation<Product, number>({
      query: (id) => ({ url: `/products/${id}/archive`, method: "POST" }),
      invalidatesTags: (_result, _error, id) => [
        "Products",
        { type: "Product", id },
      ],
    }),
    restoreProduct: build.mutation<Product, number>({
      query: (id) => ({ url: `/products/${id}/restore`, method: "POST" }),
      invalidatesTags: (_result, _error, id) => [
        "Products",
        { type: "Product", id },
      ],
    }),
    replaceProductCategories: build.mutation<
      Product,
      { id: number; categoryIds: number[] }
    >({
      query: ({ id, categoryIds }) => ({
        url: `/products/${id}/categories`,
        method: "PUT",
        data: { categoryIds },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        "Products",
        "Categories",
        { type: "Product", id },
      ],
    }),
    publishAtOutlet: build.mutation<
      Product,
      { id: number; outletId: number; isPublished: boolean }
    >({
      query: ({ id, outletId, isPublished }) => ({
        url: `/products/${id}/outlets/${outletId}`,
        method: "PUT",
        data: { isPublished },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        "Products",
        { type: "Product", id },
      ],
    }),
    setStock: build.mutation<
      Product,
      { id: number; outletId: number; stock: StockChange }
    >({
      query: ({ id, outletId, stock }) => ({
        url: `/products/${id}/outlets/${outletId}/stock`,
        method: "PUT",
        data: stock,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        "Products",
        "Movements",
        { type: "Product", id },
      ],
    }),
    adjustStock: build.mutation<
      Product,
      { id: number; outletId: number; delta: number; reason: string }
    >({
      query: ({ id, outletId, delta, reason }) => ({
        url: `/products/${id}/outlets/${outletId}/stock/adjust`,
        method: "POST",
        data: { delta, reason },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        "Products",
        "Movements",
        { type: "Product", id },
      ],
    }),
    movements: build.query<
      MovementPage,
      { id: number; outletId: number; page: number }
    >({
      query: ({ id, outletId, page }) => ({
        url: `/products/${id}/outlets/${outletId}/stock/movements`,
        params: { page, itemsPerPage: 10 },
      }),
      providesTags: ["Movements"],
    }),
    categories: build.query<Category[], boolean | void>({
      query: (includeArchived) => ({
        url: "/categories",
        params: includeArchived ? { includeArchived: true } : undefined,
      }),
      providesTags: ["Categories"],
    }),
    createUpload: build.mutation<
      UploadCreated,
      { contentType: string; sizeBytes: number }
    >({
      query: (data) => ({ url: "/media/uploads", method: "POST", data }),
    }),
    completeUpload: build.mutation<Media, number>({
      query: (id) => ({ url: `/media/${id}/complete`, method: "POST" }),
    }),
  }),
});

export const {
  useProductsQuery,
  useProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useArchiveProductMutation,
  useRestoreProductMutation,
  useReplaceProductCategoriesMutation,
  usePublishAtOutletMutation,
  useSetStockMutation,
  useAdjustStockMutation,
  useMovementsQuery,
  useCategoriesQuery,
  useCreateUploadMutation,
  useCompleteUploadMutation,
} = catalogApi;
