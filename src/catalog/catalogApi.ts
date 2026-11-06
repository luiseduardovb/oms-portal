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
export type CategoryCreate = Schemas["CategoryCreate"];
export type CategoryChanges = Schemas["CategoryUpdate"];
export type OptionGroup = Schemas["OptionGroupOut"];
export type OptionGroupCreate = Schemas["OptionGroupCreate"];
export type OptionGroupChanges = Schemas["OptionGroupUpdate"];
export type Option = Schemas["OptionOut"];
export type OptionCreate = Schemas["OptionCreate"];
export type OptionChanges = Schemas["OptionUpdate"];
export type GroupLink = Schemas["ProductGroupLink"];
export type ImportJob = Schemas["ImportJobOut"];
export type ImportIssue = Schemas["ImportIssueOut"];
export type ExportJob = Schemas["ExportJobOut"];

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
    createCategory: build.mutation<Category, CategoryCreate>({
      query: (data) => ({ url: "/categories", method: "POST", data }),
      invalidatesTags: ["Categories"],
    }),
    updateCategory: build.mutation<
      Category,
      { id: number; changes: CategoryChanges }
    >({
      query: ({ id, changes }) => ({
        url: `/categories/${id}`,
        method: "PATCH",
        data: changes,
      }),
      invalidatesTags: ["Categories", "Products"],
    }),
    archiveCategory: build.mutation<Category, number>({
      query: (id) => ({ url: `/categories/${id}/archive`, method: "POST" }),
      invalidatesTags: ["Categories", "Products"],
    }),
    restoreCategory: build.mutation<Category, number>({
      query: (id) => ({ url: `/categories/${id}/restore`, method: "POST" }),
      invalidatesTags: ["Categories", "Products"],
    }),
    reorderCategories: build.mutation<unknown, number[]>({
      query: (ids) => ({
        url: "/categories/order",
        method: "PUT",
        data: { ids },
      }),
      invalidatesTags: ["Categories"],
    }),
    optionGroups: build.query<OptionGroup[], boolean | void>({
      query: (includeArchived) => ({
        url: "/option-groups",
        params: includeArchived ? { includeArchived: true } : undefined,
      }),
      providesTags: ["OptionGroups"],
    }),
    createOptionGroup: build.mutation<OptionGroup, OptionGroupCreate>({
      query: (data) => ({ url: "/option-groups", method: "POST", data }),
      invalidatesTags: ["OptionGroups"],
    }),
    updateOptionGroup: build.mutation<
      OptionGroup,
      { id: number; changes: OptionGroupChanges }
    >({
      query: ({ id, changes }) => ({
        url: `/option-groups/${id}`,
        method: "PATCH",
        data: changes,
      }),
      invalidatesTags: ["OptionGroups", "Products"],
    }),
    archiveOptionGroup: build.mutation<OptionGroup, number>({
      query: (id) => ({
        url: `/option-groups/${id}/archive`,
        method: "POST",
      }),
      invalidatesTags: ["OptionGroups", "Products"],
    }),
    restoreOptionGroup: build.mutation<OptionGroup, number>({
      query: (id) => ({
        url: `/option-groups/${id}/restore`,
        method: "POST",
      }),
      invalidatesTags: ["OptionGroups", "Products"],
    }),
    reorderOptionGroups: build.mutation<unknown, number[]>({
      query: (ids) => ({
        url: "/option-groups/order",
        method: "PUT",
        data: { ids },
      }),
      invalidatesTags: ["OptionGroups"],
    }),
    createOption: build.mutation<
      OptionGroup,
      { groupId: number; option: OptionCreate }
    >({
      query: ({ groupId, option }) => ({
        url: `/option-groups/${groupId}/options`,
        method: "POST",
        data: option,
      }),
      invalidatesTags: ["OptionGroups"],
    }),
    updateOption: build.mutation<
      OptionGroup,
      { id: number; changes: OptionChanges }
    >({
      query: ({ id, changes }) => ({
        url: `/options/${id}`,
        method: "PATCH",
        data: changes,
      }),
      invalidatesTags: ["OptionGroups"],
    }),
    archiveOption: build.mutation<OptionGroup, number>({
      query: (id) => ({ url: `/options/${id}/archive`, method: "POST" }),
      invalidatesTags: ["OptionGroups"],
    }),
    restoreOption: build.mutation<OptionGroup, number>({
      query: (id) => ({ url: `/options/${id}/restore`, method: "POST" }),
      invalidatesTags: ["OptionGroups"],
    }),
    reorderOptions: build.mutation<
      OptionGroup,
      { groupId: number; ids: number[] }
    >({
      query: ({ groupId, ids }) => ({
        url: `/option-groups/${groupId}/options/order`,
        method: "PUT",
        data: { ids },
      }),
      invalidatesTags: ["OptionGroups"],
    }),
    setOptionAvailability: build.mutation<
      OptionGroup,
      { id: number; outletId: number; isAvailable: boolean }
    >({
      query: ({ id, outletId, isAvailable }) => ({
        url: `/options/${id}/outlets/${outletId}`,
        method: "PUT",
        data: { isAvailable },
      }),
      invalidatesTags: ["OptionGroups"],
    }),
    setProductGroups: build.mutation<
      Product,
      { id: number; groups: GroupLink[] }
    >({
      query: ({ id, groups }) => ({
        url: `/products/${id}/option-groups`,
        method: "PUT",
        data: { groups },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        "Products",
        "OptionGroups",
        { type: "Product", id },
      ],
    }),
    createImport: build.mutation<
      Schemas["ImportCreated"],
      { sizeBytes: number }
    >({
      query: ({ sizeBytes }) => ({
        url: "/import-jobs",
        method: "POST",
        data: { kind: "catalog", sizeBytes },
      }),
    }),
    completeImport: build.mutation<ImportJob, number>({
      query: (id) => ({ url: `/import-jobs/${id}/complete`, method: "POST" }),
    }),
    applyImport: build.mutation<ImportJob, number>({
      query: (id) => ({ url: `/import-jobs/${id}/apply`, method: "POST" }),
      invalidatesTags: ["Products", "Categories"],
    }),
    createExport: build.mutation<ExportJob, void>({
      query: () => ({
        url: "/export-jobs",
        method: "POST",
        data: { kind: "catalog" },
      }),
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
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useArchiveCategoryMutation,
  useRestoreCategoryMutation,
  useReorderCategoriesMutation,
  useOptionGroupsQuery,
  useCreateOptionGroupMutation,
  useUpdateOptionGroupMutation,
  useArchiveOptionGroupMutation,
  useRestoreOptionGroupMutation,
  useReorderOptionGroupsMutation,
  useCreateOptionMutation,
  useUpdateOptionMutation,
  useArchiveOptionMutation,
  useRestoreOptionMutation,
  useReorderOptionsMutation,
  useSetOptionAvailabilityMutation,
  useSetProductGroupsMutation,
  useCreateImportMutation,
  useCompleteImportMutation,
  useApplyImportMutation,
  useCreateExportMutation,
  useCreateUploadMutation,
  useCompleteUploadMutation,
} = catalogApi;
