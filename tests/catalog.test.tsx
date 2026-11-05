import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http } from "@/api/http";
import { sessionStarted } from "@/auth/sessionSlice";
import { setAccessToken } from "@/auth/tokenStore";
import { formatMoney, stockLevel } from "@/catalog/money";
import { NAV_ITEMS, visibleNav } from "@/components/shell/nav";
import { makeStore } from "@/store";
import ProductPage from "../src/app/(app)/catalog/[id]/page";
import CatalogPage from "../src/app/(app)/catalog/page";
import { apiError, fakeApi, ME } from "./fakeApi";
import { renderWithProviders } from "./render";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/catalog",
  useParams: () => ({ id: "3" }),
}));

const MEDIA = {
  id: 50,
  status: "ready",
  width: 800,
  height: 600,
  largeUrl: "https://files/l.jpg",
  thumbUrl: "https://files/t.jpg",
  failureReason: null,
};

const PRODUCT = {
  id: 3,
  name: "Baleada",
  description: "Con huevo",
  image: null,
  basePrice: "85.00",
  priceIncludesTax: true,
  sku: "BAL-1",
  prepTimeMinutes: 10,
  isPublished: true,
  sortOrder: 0,
  archivedAt: null,
  categories: [{ id: 1, name: "Desayunos" }],
  outlets: [
    {
      outletId: 7,
      isPublished: true,
      stockStatus: "tracked",
      quantity: 2,
      lowStockThreshold: 5,
      isSoldOut: false,
      version: 4,
    },
  ],
  optionGroups: [],
};
const SODA = {
  ...PRODUCT,
  id: 4,
  name: "Soda",
  sku: null,
  basePrice: "30.5",
  categories: [],
  outlets: [],
};
const OUTLET = {
  id: 7,
  name: "Centro",
  addressText: null,
  phone: null,
  timezone: "America/Tegucigalpa",
  isPublic: true,
  pickupEnabled: true,
  deliveryEnabled: true,
  isBusy: false,
  archivedAt: null,
};
const CATEGORIES = [
  { id: 1, name: "Desayunos" },
  { id: 2, name: "Bebidas" },
];

const MANAGER = { ...ME, levels: { ...ME.levels, catalog: "full" } };
const VIEWER = { ...ME, levels: { ...ME.levels, catalog: "view" } };
const OPERATOR = {
  ...ME,
  levels: { orders: "full", catalog: "view" },
  extras: ["availability_toggle"],
};

type Handler = Parameters<typeof fakeApi>[1];

function open(
  ui: React.ReactElement,
  me: object = MANAGER,
  overrides: Handler = () => ({ status: 200, data: PRODUCT }),
  product: object = PRODUCT,
) {
  const store = makeStore();
  store.dispatch(sessionStarted());
  setAccessToken("token");
  const api = fakeApi(http, (call) => {
    if (call.url === "/me") return { status: 200, data: me };
    if (call.url === "/outlets") return { status: 200, data: [OUTLET] };
    if (call.url === "/categories") return { status: 200, data: CATEGORIES };
    if (call.url === "/products" && call.method === "GET")
      return {
        status: 200,
        data: {
          page: 1,
          itemsPerPage: 25,
          totalPages: 1,
          totalCount: 2,
          results: [PRODUCT, SODA],
        },
      };
    if (call.url === "/products/3" && call.method === "GET")
      return { status: 200, data: product };
    return overrides(call);
  });
  renderWithProviders(ui, store);
  return api;
}

const writes = <T extends { method: string }>(calls: T[]) =>
  calls.filter((c) => c.method !== "GET");

beforeEach(() => push.mockClear());
afterEach(() => {
  setAccessToken(null);
  vi.restoreAllMocks();
});

describe("catalog helpers", () => {
  it("formats money with the merchant currency", () => {
    expect(formatMoney("1250.5", "HNL")).toMatch(/^L 1.250,50|L 1,250.50$/);
    expect(formatMoney("85", "USD")).toContain("$ ");
    expect(formatMoney("85", "EUR")).toMatch(/^EUR /);
  });

  it("reads the stock level of an outlet", () => {
    const base = {
      stockStatus: "tracked",
      quantity: 9,
      lowStockThreshold: 5,
      isSoldOut: false,
    };
    expect(stockLevel(base)).toBe("tracked");
    expect(stockLevel({ ...base, quantity: 5 })).toBe("low");
    expect(stockLevel({ ...base, quantity: 0, isSoldOut: true })).toBe("out");
    expect(stockLevel({ ...base, stockStatus: "in_stock" })).toBe("in");
  });

  it("shows the catalog entry to roles with catalog access only", () => {
    const keys = (levels: Record<string, string>) =>
      visibleNav(NAV_ITEMS, levels).map((i) => i.key);
    expect(keys({ catalog: "view" })).toContain("catalog");
    expect(keys({ orders: "full" })).not.toContain("catalog");
  });
});

describe("Catálogo list", () => {
  it("lists products with price in the merchant currency", async () => {
    open(<CatalogPage />);
    const table = await screen.findByRole("table", { name: "Productos" });
    const row = within(table).getByText("Baleada").closest("tr")!;
    expect(within(row).getByText("BAL-1")).toBeInTheDocument();
    expect(within(row).getByText("Desayunos")).toBeInTheDocument();
    expect(within(row).getByText(/^L\s85\.00$/)).toBeInTheDocument();
    expect(within(table).getByText(/^L\s30\.50$/)).toBeInTheDocument();
    expect(within(table).queryByText("Stock")).toBeNull();
  });

  it("shows low stock for the chosen outlet and filters on the server", async () => {
    const { calls } = open(<CatalogPage />);
    await screen.findByRole("table", { name: "Productos" });
    await userEvent.click(screen.getByLabelText("Sucursal"));
    await userEvent.click(
      await screen.findByRole("option", { name: "Centro" }),
    );
    expect(await screen.findByText("Poco stock: 2")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        calls.filter((c) => c.url === "/products").at(-1)?.params,
      ).toMatchObject({ outletId: 7, page: 1 }),
    );
    await userEvent.type(screen.getByLabelText("Nombre o SKU"), "bale{Enter}");
    await waitFor(() =>
      expect(
        calls.filter((c) => c.url === "/products").at(-1)?.params,
      ).toMatchObject({ search: "bale" }),
    );
  });

  it("asks for archived products on request", async () => {
    const { calls } = open(<CatalogPage />);
    await screen.findByRole("table", { name: "Productos" });
    await userEvent.click(screen.getByLabelText("Mostrar archivados"));
    await waitFor(() =>
      expect(
        calls.filter((c) => c.url === "/products").at(-1)?.params,
      ).toMatchObject({ includeArchived: true }),
    );
  });

  it("publishes and unpublishes from the table", async () => {
    const { calls } = open(<CatalogPage />, MANAGER, (call) => ({
      status: 200,
      data: { ...PRODUCT, isPublished: false, ...(call.data as object) },
    }));
    await userEvent.click(
      await screen.findByRole("switch", { name: "Publicar Baleada" }),
    );
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "PATCH",
        url: "/products/3",
        data: { isPublished: false },
      }),
    );
  });

  it("is read-only for view-only roles", async () => {
    open(<CatalogPage />, VIEWER);
    expect(
      await screen.findByRole("switch", { name: "Publicar Baleada" }),
    ).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Nuevo producto" })).toBeNull();
  });

  it("hides the page from roles without catalog access", async () => {
    open(<CatalogPage />, { ...ME, levels: { orders: "full" } });
    expect(
      await screen.findByText("Tu rol no tiene acceso al catálogo."),
    ).toBeInTheDocument();
  });

  it("creates a product from name and price and opens it", async () => {
    const { calls } = open(<CatalogPage />, MANAGER, (call) =>
      call.method === "POST"
        ? { status: 201, data: { ...PRODUCT, id: 9 } }
        : { status: 200, data: [] },
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Nuevo producto" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Crear producto" }),
    );
    expect(
      await screen.findByText("Ingresa el nombre del producto."),
    ).toBeInTheDocument();
    expect(writes(calls)).toEqual([]);
    await userEvent.type(screen.getByLabelText("Nombre"), "Pastel");
    await userEvent.type(screen.getByLabelText("Precio (L)"), "12.345");
    await userEvent.click(
      screen.getByRole("button", { name: "Crear producto" }),
    );
    expect(await screen.findByText(/Usa un precio como/)).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Precio (L)"));
    await userEvent.type(screen.getByLabelText("Precio (L)"), "12.5");
    await userEvent.click(
      screen.getByRole("button", { name: "Crear producto" }),
    );
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "POST",
        url: "/products",
        data: { name: "Pastel", basePrice: "12.5", isPublished: false },
      }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/catalog/9"));
  });
});

describe("Producto editor", () => {
  it("saves changed data with the price as text", async () => {
    const { calls } = open(<ProductPage />, MANAGER, () => ({
      status: 200,
      data: PRODUCT,
    }));
    const name = await screen.findByLabelText("Nombre");
    await userEvent.clear(name);
    await userEvent.type(name, "Baleada sencilla");
    await userEvent.clear(screen.getByLabelText("Precio (L)"));
    await userEvent.type(screen.getByLabelText("Precio (L)"), "90");
    await userEvent.clear(screen.getByLabelText("SKU"));
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "PATCH",
        url: "/products/3",
        data: {
          name: "Baleada sencilla",
          basePrice: "90",
          sku: null,
          prepTimeMinutes: 10,
          priceIncludesTax: true,
        },
      }),
    );
    expect(await screen.findByText("Cambios guardados.")).toBeInTheDocument();
  });

  it("checks name, price and minutes before saving", async () => {
    const { calls } = open(<ProductPage />);
    await userEvent.clear(await screen.findByLabelText("Nombre"));
    await userEvent.clear(screen.getByLabelText("Precio (L)"));
    await userEvent.type(screen.getByLabelText("Precio (L)"), "-4");
    await userEvent.clear(
      screen.getByLabelText("Tiempo de preparación (minutos)"),
    );
    await userEvent.type(
      screen.getByLabelText("Tiempo de preparación (minutos)"),
      "700",
    );
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(
      await screen.findByText("Ingresa el nombre del producto."),
    ).toBeInTheDocument();
    expect(screen.getByText(/Usa un precio como/)).toBeInTheDocument();
    expect(screen.getByText(/entre 0 y 600/)).toBeInTheDocument();
    expect(writes(calls)).toEqual([]);
  });

  it("explains a taken SKU", async () => {
    open(<ProductPage />, MANAGER, () => apiError(409, "catalog.sku_taken"));
    await screen.findByLabelText("Nombre");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(
      await screen.findByText("Otro producto ya usa ese SKU."),
    ).toBeInTheDocument();
  });

  it("is read-only without full catalog access", async () => {
    open(<ProductPage />, VIEWER);
    expect(await screen.findByLabelText("Nombre")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Guardar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Elegir foto" })).toBeNull();
  });

  it("is read-only for members limited to some outlets", async () => {
    open(<ProductPage />, { ...MANAGER, outlets: { all: false, ids: [7] } });
    expect(await screen.findByLabelText("Nombre")).toBeDisabled();
  });

  it("archives a product", async () => {
    const { calls } = open(<ProductPage />, MANAGER, () => ({
      status: 200,
      data: { ...PRODUCT, archivedAt: "2026-11-05T00:00:00Z" },
    }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Archivar" }),
    );
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "POST",
        url: "/products/3/archive",
      }),
    );
  });

  it("restores an archived product", async () => {
    const { calls } = open(
      <ProductPage />,
      MANAGER,
      () => ({ status: 200, data: PRODUCT }),
      { ...PRODUCT, archivedAt: "2026-11-05T00:00:00Z" },
    );
    expect(
      await screen.findByText(/Este producto está archivado/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Restaurar" }));
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        url: "/products/3/restore",
      }),
    );
  });

  describe("photo", () => {
    const pick = (file: File) =>
      fireEvent.change(screen.getByLabelText("Archivo de foto"), {
        target: { files: [file] },
      });

    it("rejects the wrong type and oversize files without calling the API", async () => {
      const { calls } = open(<ProductPage />);
      await screen.findByLabelText("Nombre");
      pick(new File(["x"], "a.gif", { type: "image/gif" }));
      expect(
        await screen.findByText("Usa una imagen JPEG, PNG o WebP."),
      ).toBeInTheDocument();
      const big = new File(["x"], "a.png", { type: "image/png" });
      Object.defineProperty(big, "size", { value: 6 * 1024 * 1024 });
      pick(big);
      expect(
        await screen.findByText("La imagen pesa más de 5 MB."),
      ).toBeInTheDocument();
      expect(writes(calls)).toEqual([]);
    });

    it("uploads to storage, waits for the image and attaches it", async () => {
      const put = vi.spyOn(axios, "request").mockResolvedValue({ status: 200 });
      const { calls } = open(<ProductPage />, MANAGER, (call) => {
        if (call.url === "/media/uploads")
          return {
            status: 201,
            data: {
              id: 50,
              upload: {
                url: "https://storage/put",
                method: "PUT",
                headers: { "Content-Type": "image/png" },
              },
            },
          };
        if (call.url === "/media/50/complete")
          return { status: 200, data: { ...MEDIA, status: "ready" } };
        return { status: 200, data: { ...PRODUCT, image: MEDIA } };
      });
      await screen.findByLabelText("Nombre");
      pick(new File(["abc"], "a.png", { type: "image/png" }));
      await waitFor(() =>
        expect(writes(calls).map((c) => c.url)).toEqual([
          "/media/uploads",
          "/media/50/complete",
          "/products/3",
        ]),
      );
      expect(writes(calls)[0]?.data).toEqual({
        contentType: "image/png",
        sizeBytes: 3,
      });
      expect(writes(calls)[2]?.data).toEqual({ imageMediaId: 50 });
      expect(put).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://storage/put",
          method: "PUT",
          headers: { "Content-Type": "image/png" },
        }),
      );
    });

    it("tells when the file is not a usable image", async () => {
      vi.spyOn(axios, "request").mockResolvedValue({ status: 200 });
      const { calls } = open(<ProductPage />, MANAGER, (call) => {
        if (call.url === "/media/uploads")
          return {
            status: 201,
            data: {
              id: 51,
              upload: {
                url: "https://storage/put",
                method: "PUT",
                headers: {},
              },
            },
          };
        return {
          status: 200,
          data: {
            ...MEDIA,
            id: 51,
            status: "failed",
            failureReason: "not_an_image",
          },
        };
      });
      await screen.findByLabelText("Nombre");
      pick(new File(["abc"], "a.png", { type: "image/png" }));
      expect(
        await screen.findByText("No pudimos usar ese archivo como imagen."),
      ).toBeInTheDocument();
      expect(writes(calls).some((c) => c.url === "/products/3")).toBe(false);
    });

    it("says so when storage refuses the file", async () => {
      vi.spyOn(axios, "request").mockRejectedValue(new Error("403"));
      open(<ProductPage />, MANAGER, () => ({
        status: 201,
        data: {
          id: 52,
          upload: { url: "https://storage/put", method: "PUT", headers: {} },
        },
      }));
      await screen.findByLabelText("Nombre");
      pick(new File(["abc"], "a.png", { type: "image/png" }));
      expect(
        await screen.findByText("No pudimos subir la foto. Intenta de nuevo."),
      ).toBeInTheDocument();
    });

    it("replaces and removes an existing photo", async () => {
      const { calls } = open(
        <ProductPage />,
        MANAGER,
        () => ({ status: 200, data: PRODUCT }),
        { ...PRODUCT, image: MEDIA },
      );
      expect(
        await screen.findByRole("button", { name: "Cambiar foto" }),
      ).toBeInTheDocument();
      await userEvent.click(
        screen.getByRole("button", { name: "Quitar foto" }),
      );
      await waitFor(() =>
        expect(writes(calls)[0]).toMatchObject({
          method: "PATCH",
          data: { imageMediaId: null },
        }),
      );
    });
  });

  describe("categories tab", () => {
    it("saves the chosen categories", async () => {
      const { calls } = open(<ProductPage />);
      await userEvent.click(
        await screen.findByRole("tab", { name: "Categorías" }),
      );
      const group = await screen.findByRole("group", {
        name: "Categorías del producto",
      });
      expect(await within(group).findByLabelText("Desayunos")).toBeChecked();
      await userEvent.click(within(group).getByLabelText("Bebidas"));
      await userEvent.click(
        screen.getByRole("button", { name: "Guardar categorías" }),
      );
      await waitFor(() =>
        expect(writes(calls)[0]).toMatchObject({
          method: "PUT",
          url: "/products/3/categories",
          data: { categoryIds: [1, 2] },
        }),
      );
    });

    it("cannot be changed by a viewer", async () => {
      open(<ProductPage />, VIEWER);
      await userEvent.click(
        await screen.findByRole("tab", { name: "Categorías" }),
      );
      expect(await screen.findByLabelText("Bebidas")).toBeDisabled();
      expect(
        screen.queryByRole("button", { name: "Guardar categorías" }),
      ).toBeNull();
    });
  });

  describe("availability tab", () => {
    const openTab = async () =>
      userEvent.click(
        await screen.findByRole("tab", {
          name: "Disponibilidad por sucursal",
        }),
      );

    it("shows each outlet with its stock", async () => {
      open(<ProductPage />);
      await openTab();
      const table = await screen.findByRole("table", {
        name: "Disponibilidad por sucursal",
      });
      const row = within(table).getByText("Centro").closest("tr")!;
      expect(within(row).getByText("Poco stock: 2")).toBeInTheDocument();
      expect(
        within(row).getByRole("switch", { name: "Publicar en Centro" }),
      ).toBeChecked();
    });

    it("publishes at one outlet", async () => {
      const { calls } = open(<ProductPage />);
      await openTab();
      await userEvent.click(
        await screen.findByRole("switch", { name: "Publicar en Centro" }),
      );
      await waitFor(() =>
        expect(writes(calls)[0]).toMatchObject({
          method: "PUT",
          url: "/products/3/outlets/7",
          data: { isPublished: false },
        }),
      );
    });

    it("sets tracked stock with the version it read", async () => {
      const { calls } = open(<ProductPage />);
      await openTab();
      await userEvent.click(
        await screen.findByRole("button", { name: "Stock" }),
      );
      const quantity = await screen.findByLabelText("Cantidad");
      await userEvent.clear(quantity);
      await userEvent.type(quantity, "abc");
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
      expect(
        await screen.findByText("Usa un número entero de 0 en adelante."),
      ).toBeInTheDocument();
      await userEvent.clear(quantity);
      await userEvent.type(quantity, "20");
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
      await waitFor(() =>
        expect(writes(calls)[0]).toMatchObject({
          method: "PUT",
          url: "/products/3/outlets/7/stock",
          data: {
            status: "tracked",
            quantity: 20,
            lowStockThreshold: 5,
            version: 4,
          },
        }),
      );
    });

    it("explains a stock version conflict", async () => {
      open(<ProductPage />, MANAGER, () =>
        apiError(409, "catalog.stock_version_conflict"),
      );
      await openTab();
      await userEvent.click(
        await screen.findByRole("button", { name: "Stock" }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
      expect(
        await screen.findByText(/Alguien más cambió el stock/),
      ).toBeInTheDocument();
    });

    it("adjusts stock with a reason", async () => {
      const { calls } = open(<ProductPage />);
      await openTab();
      await userEvent.click(
        await screen.findByRole("button", { name: "Ajustar" }),
      );
      await userEvent.type(screen.getByLabelText("Cambio"), "-3");
      await userEvent.click(screen.getByRole("button", { name: "Ajustar" }));
      expect(
        await screen.findByText("Indica el motivo del ajuste."),
      ).toBeInTheDocument();
      await userEvent.type(screen.getByLabelText("Motivo"), "Merma");
      await userEvent.click(screen.getByRole("button", { name: "Ajustar" }));
      await waitFor(() =>
        expect(writes(calls)[0]).toMatchObject({
          method: "POST",
          url: "/products/3/outlets/7/stock/adjust",
          data: { delta: -3, reason: "Merma" },
        }),
      );
    });

    it("lists movements", async () => {
      open(<ProductPage />, MANAGER, (call) =>
        call.url.endsWith("/stock/movements")
          ? {
              status: 200,
              data: {
                page: 1,
                itemsPerPage: 10,
                totalPages: 1,
                totalCount: 1,
                results: [
                  {
                    id: 1,
                    delta: -3,
                    quantityAfter: 2,
                    oldStatus: "tracked",
                    newStatus: "tracked",
                    reason: "Merma",
                    actorUserId: 1,
                    orderId: null,
                    createdAt: "2026-11-05T12:00:00Z",
                  },
                ],
              },
            }
          : { status: 200, data: PRODUCT },
      );
      await openTab();
      await userEvent.click(
        await screen.findByRole("button", { name: "Movimientos" }),
      );
      const table = await screen.findByRole("table", {
        name: "Movimientos de stock",
      });
      expect(within(table).getByText("Merma")).toBeInTheDocument();
      expect(within(table).getByText("-3")).toBeInTheDocument();
    });

    it("lets the Operator switch sold-out on untracked products only", async () => {
      const untracked = {
        ...PRODUCT,
        outlets: [{ ...PRODUCT.outlets[0], stockStatus: "in_stock" }],
      };
      const { calls } = open(
        <ProductPage />,
        OPERATOR,
        () => ({ status: 200, data: untracked }),
        untracked,
      );
      await openTab();
      expect(screen.queryByRole("button", { name: "Stock" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Ajustar" })).toBeNull();
      await userEvent.click(
        await screen.findByRole("switch", { name: "Agotado en Centro" }),
      );
      await waitFor(() =>
        expect(writes(calls)[0]).toMatchObject({
          method: "PUT",
          url: "/products/3/outlets/7/stock",
          data: { status: "out_of_stock" },
        }),
      );
    });

    it("keeps everything off for a viewer without the extra", async () => {
      open(<ProductPage />, VIEWER);
      await openTab();
      expect(
        await screen.findByRole("switch", { name: "Publicar en Centro" }),
      ).toBeDisabled();
      expect(screen.queryByRole("button", { name: "Stock" })).toBeNull();
    });
  });
});
