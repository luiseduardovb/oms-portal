import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http } from "@/api/http";
import { sessionStarted } from "@/auth/sessionSlice";
import { setAccessToken } from "@/auth/tokenStore";
import { moveId } from "@/catalog/reorder";
import { makeStore } from "@/store";
import ProductPage from "../src/app/(app)/catalog/[id]/page";
import CategoriesPage from "../src/app/(app)/catalog/categories/page";
import ImportExportPage from "../src/app/(app)/catalog/import/page";
import OptionGroupsPage from "../src/app/(app)/catalog/options/page";
import { apiError, fakeApi, ME } from "./fakeApi";
import { renderWithProviders } from "./render";

let path = "/catalog/categories";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => path,
  useParams: () => ({ id: "3" }),
}));

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

const category = (id: number, name: string, extra: object = {}) => ({
  id,
  name,
  description: null,
  image: null,
  sortOrder: id,
  isPublished: true,
  archivedAt: null,
  productCount: id * 2,
  outlets: [],
  ...extra,
});
const CATEGORIES = [category(1, "Desayunos"), category(2, "Bebidas")];
const OLD_CATEGORY = category(3, "Viejas", {
  archivedAt: "2026-10-01T00:00:00Z",
});

const option = (id: number, name: string, extra: object = {}) => ({
  id,
  name,
  priceDelta: "0.00",
  isDefault: false,
  sortOrder: id,
  archivedAt: null,
  unavailableOutletIds: [],
  ...extra,
});
const GROUP = {
  id: 1,
  name: "Tamaño",
  selectionType: "single",
  isRequired: true,
  minSelect: 1,
  maxSelect: 1,
  sortOrder: 1,
  archivedAt: null,
  productCount: 3,
  options: [
    option(5, "Grande", { priceDelta: "15.00" }),
    option(6, "Normal", { isDefault: true }),
    option(7, "Viejo", { archivedAt: "2026-10-01T00:00:00Z" }),
  ],
};
const EXTRAS = {
  ...GROUP,
  id: 2,
  name: "Extras",
  selectionType: "multiple",
  isRequired: false,
  minSelect: 0,
  maxSelect: 3,
  productCount: 0,
  options: [option(8, "Queso", { priceDelta: "10.00" })],
};

const PRODUCT = {
  id: 3,
  name: "Baleada",
  description: null,
  image: null,
  basePrice: "85.00",
  priceIncludesTax: true,
  sku: "BAL-1",
  prepTimeMinutes: null,
  isPublished: true,
  sortOrder: 0,
  archivedAt: null,
  categories: [],
  outlets: [],
  optionGroups: [
    {
      id: 1,
      name: "Tamaño",
      selectionType: "single",
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      minOverride: null,
      maxOverride: null,
    },
  ],
};

const MANAGER = {
  ...ME,
  levels: { ...ME.levels, catalog: "full" },
  extras: ["availability_toggle", "export_data"],
};
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
  overrides: Handler = () => ({ status: 200, data: {} }),
) {
  const store = makeStore();
  store.dispatch(sessionStarted());
  setAccessToken("token");
  const api = fakeApi(http, (call) => {
    if (call.url === "/me") return { status: 200, data: me };
    if (call.url === "/outlets") return { status: 200, data: [OUTLET] };
    if (call.url === "/categories" && call.method === "GET")
      return {
        status: 200,
        data: call.params?.includeArchived
          ? [...CATEGORIES, OLD_CATEGORY]
          : CATEGORIES,
      };
    if (call.url === "/option-groups" && call.method === "GET")
      return { status: 200, data: [GROUP, EXTRAS] };
    if (call.url === "/products/3" && call.method === "GET")
      return { status: 200, data: PRODUCT };
    return overrides(call);
  });
  renderWithProviders(ui, store);
  return api;
}

const writes = <T extends { method: string }>(calls: T[]) =>
  calls.filter((c) => c.method !== "GET");

beforeEach(() => {
  path = "/catalog/categories";
});
afterEach(() => {
  setAccessToken(null);
  vi.restoreAllMocks();
});

describe("moveId", () => {
  it("swaps with a neighbour and refuses to leave the list", () => {
    expect(moveId([1, 2, 3], 2, -1)).toEqual([2, 1, 3]);
    expect(moveId([1, 2, 3], 2, 1)).toEqual([1, 3, 2]);
    expect(moveId([1, 2, 3], 1, -1)).toBeNull();
    expect(moveId([1, 2, 3], 3, 1)).toBeNull();
    expect(moveId([1, 2, 3], 9, 1)).toBeNull();
  });
});

describe("Catalog sections", () => {
  it("links the four screens and marks the current one", async () => {
    open(<CategoriesPage />);
    const tabs = await screen.findByRole("tablist", {
      name: "Secciones del catálogo",
    });
    for (const name of [
      "Productos",
      "Categorías",
      "Opciones",
      "Importar y exportar",
    ]) {
      expect(within(tabs).getByRole("tab", { name })).toBeInTheDocument();
    }
    expect(
      within(tabs).getByRole("tab", { name: "Categorías" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(within(tabs).getByRole("tab", { name: "Opciones" })).toHaveAttribute(
      "href",
      "/catalog/options",
    );
  });
});

describe("Categorías", () => {
  it("lists categories and asks for archived ones on request", async () => {
    const { calls } = open(<CategoriesPage />);
    const table = await screen.findByRole("table", { name: "Categorías" });
    expect(within(table).getByText("Desayunos")).toBeInTheDocument();
    expect(within(table).queryByText("Viejas")).toBeNull();
    await userEvent.click(screen.getByLabelText("Mostrar archivadas"));
    const row = (await screen.findByText("Viejas")).closest("tr")!;
    expect(within(row).getByText("Archivada")).toBeInTheDocument();
    expect(
      within(row).getByRole("button", { name: "Restaurar Viejas" }),
    ).toBeInTheDocument();
    expect(calls.filter((c) => c.url === "/categories").at(-1)?.params).toEqual(
      {
        includeArchived: true,
      },
    );
  });

  it("creates a category", async () => {
    const { calls } = open(<CategoriesPage />, MANAGER, () => ({
      status: 201,
      data: category(9, "Postres"),
    }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Nueva categoría" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(
      await screen.findByText("Ingresa el nombre de la categoría."),
    ).toBeInTheDocument();
    expect(writes(calls)).toEqual([]);
    await userEvent.type(screen.getByLabelText("Nombre"), "Postres");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "POST",
        url: "/categories",
        data: { name: "Postres", description: null, isPublished: true },
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("explains a taken name and keeps the dialog open", async () => {
    open(<CategoriesPage />, MANAGER, () =>
      apiError(409, "catalog.category_name_taken"),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Nueva categoría" }),
    );
    await userEvent.type(screen.getByLabelText("Nombre"), "Bebidas");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(
      await screen.findByText("Otra categoría ya usa ese nombre."),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renames a category", async () => {
    const { calls } = open(<CategoriesPage />, MANAGER, () => ({
      status: 200,
      data: CATEGORIES[0],
    }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Editar Desayunos" }),
    );
    const name = screen.getByLabelText("Nombre");
    expect(name).toHaveValue("Desayunos");
    await userEvent.clear(name);
    await userEvent.type(name, "Mañanas");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "PATCH",
        url: "/categories/1",
        data: { name: "Mañanas" },
      }),
    );
  });

  it("moves a category with the arrows, sending the whole order", async () => {
    const { calls } = open(<CategoriesPage />, MANAGER, () => ({
      status: 200,
      data: [],
    }));
    expect(
      await screen.findByRole("button", { name: "Subir Desayunos" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Bajar Bebidas" }),
    ).toBeDisabled();
    await userEvent.click(
      screen.getByRole("button", { name: "Bajar Desayunos" }),
    );
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "PUT",
        url: "/categories/order",
        data: { ids: [2, 1] },
      }),
    );
  });

  it("publishes, archives and restores", async () => {
    const { calls } = open(<CategoriesPage />, MANAGER, () => ({
      status: 200,
      data: CATEGORIES[0],
    }));
    await userEvent.click(
      await screen.findByRole("switch", { name: "Publicar Desayunos" }),
    );
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        url: "/categories/1",
        data: { isPublished: false },
      }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Archivar Bebidas" }),
    );
    await waitFor(() =>
      expect(writes(calls).at(-1)).toMatchObject({
        method: "POST",
        url: "/categories/2/archive",
      }),
    );
    await userEvent.click(screen.getByLabelText("Mostrar archivadas"));
    await userEvent.click(
      await screen.findByRole("button", { name: "Restaurar Viejas" }),
    );
    await waitFor(() =>
      expect(writes(calls).at(-1)).toMatchObject({
        url: "/categories/3/restore",
      }),
    );
  });

  it("is read-only without full catalog access", async () => {
    open(<CategoriesPage />, VIEWER);
    expect(
      await screen.findByRole("switch", { name: "Publicar Desayunos" }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Nueva categoría" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Archivar Bebidas" }),
    ).toBeNull();
  });

  it("is hidden from roles without catalog access", async () => {
    open(<CategoriesPage />, { ...ME, levels: { orders: "full" } });
    expect(
      await screen.findByText("Tu rol no tiene acceso al catálogo."),
    ).toBeInTheDocument();
  });
});

describe("Opciones", () => {
  beforeEach(() => {
    path = "/catalog/options";
  });

  it("shows groups, rules and options with price changes", async () => {
    open(<OptionGroupsPage />);
    const group = await screen.findByRole("region", { name: "Tamaño" });
    expect(within(group).getByText("Elegir una")).toBeInTheDocument();
    expect(within(group).getByText("Obligatorio")).toBeInTheDocument();
    expect(within(group).getByText("3 productos")).toBeInTheDocument();
    const table = within(group).getByRole("table", {
      name: "Opciones de Tamaño",
    });
    expect(within(table).getByText(/^\+L\s15\.00$/)).toBeInTheDocument();
    expect(within(table).getByText("Por defecto")).toBeInTheDocument();
    expect(within(table).getByText("Viejo")).toBeInTheDocument();
    const extras = screen.getByRole("region", { name: "Extras" });
    expect(within(extras).getByText("Elegir de 0 a 3")).toBeInTheDocument();
  });

  it("creates a single-choice group that is required", async () => {
    const { calls } = open(<OptionGroupsPage />, MANAGER, () => ({
      status: 201,
      data: GROUP,
    }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Nuevo grupo" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(
      await screen.findByText("Ingresa el nombre del grupo."),
    ).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Nombre"), "Término");
    await userEvent.click(screen.getByLabelText("El cliente debe elegir una"));
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "POST",
        url: "/option-groups",
        data: {
          name: "Término",
          selectionType: "single",
          minSelect: 1,
          maxSelect: 1,
        },
      }),
    );
  });

  it("checks minimum and maximum for a multiple-choice group", async () => {
    const { calls } = open(<OptionGroupsPage />, MANAGER, () => ({
      status: 201,
      data: EXTRAS,
    }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Nuevo grupo" }),
    );
    await userEvent.type(screen.getByLabelText("Nombre"), "Salsas");
    await userEvent.click(screen.getByLabelText("Tipo de selección"));
    await userEvent.click(
      await screen.findByRole("option", { name: "Elegir varias opciones" }),
    );
    await userEvent.clear(screen.getByLabelText("Mínimo a elegir"));
    await userEvent.type(screen.getByLabelText("Mínimo a elegir"), "4");
    await userEvent.clear(screen.getByLabelText("Máximo a elegir"));
    await userEvent.type(screen.getByLabelText("Máximo a elegir"), "2");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(
      await screen.findByText("El mínimo no puede ser mayor que el máximo."),
    ).toBeInTheDocument();
    expect(writes(calls)).toEqual([]);
    await userEvent.clear(screen.getByLabelText("Mínimo a elegir"));
    await userEvent.type(screen.getByLabelText("Mínimo a elegir"), "1");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        data: {
          name: "Salsas",
          selectionType: "multiple",
          minSelect: 1,
          maxSelect: 2,
        },
      }),
    );
  });

  it("explains a group change that conflicts with a product", async () => {
    open(<OptionGroupsPage />, MANAGER, () =>
      apiError(422, "catalog.group_conflicts_overrides"),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Editar grupo Extras" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(
      await screen.findByText(/tiene valores propios que chocan/),
    ).toBeInTheDocument();
  });

  it("adds an option with a negative price change", async () => {
    const { calls } = open(<OptionGroupsPage />, MANAGER, () => ({
      status: 201,
      data: GROUP,
    }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Agregar opción a Tamaño" }),
    );
    await userEvent.type(screen.getByLabelText("Nombre"), "Chico");
    await userEvent.clear(screen.getByLabelText("Cambio de precio (L)"));
    await userEvent.type(
      screen.getByLabelText("Cambio de precio (L)"),
      "-5.5x",
    );
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText(/Usa un monto como/)).toBeInTheDocument();
    expect(writes(calls)).toEqual([]);
    await userEvent.clear(screen.getByLabelText("Cambio de precio (L)"));
    await userEvent.type(screen.getByLabelText("Cambio de precio (L)"), "-5.5");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "POST",
        url: "/option-groups/1/options",
        data: { name: "Chico", priceDelta: "-5.5", isDefault: false },
      }),
    );
  });

  it("edits an option", async () => {
    const { calls } = open(<OptionGroupsPage />, MANAGER, () => ({
      status: 200,
      data: GROUP,
    }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Editar opción Normal" }),
    );
    expect(screen.getByLabelText("Elegida por defecto")).toBeChecked();
    await userEvent.click(screen.getByLabelText("Elegida por defecto"));
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "PATCH",
        url: "/options/6",
        data: { name: "Normal", priceDelta: "0.00", isDefault: false },
      }),
    );
  });

  it("explains too many defaults", async () => {
    open(<OptionGroupsPage />, MANAGER, () =>
      apiError(422, "catalog.too_many_defaults"),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Editar opción Grande" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(
      await screen.findByText(/más opciones marcadas por defecto/),
    ).toBeInTheDocument();
  });

  it("reorders options and groups with the arrows", async () => {
    const { calls } = open(<OptionGroupsPage />, MANAGER, () => ({
      status: 200,
      data: GROUP,
    }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Subir Normal" }),
    );
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "PUT",
        url: "/option-groups/1/options/order",
        data: { ids: [6, 5] },
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Bajar Tamaño" }));
    await waitFor(() =>
      expect(writes(calls).at(-1)).toMatchObject({
        url: "/option-groups/order",
        data: { ids: [2, 1] },
      }),
    );
  });

  it("archives and restores options and groups", async () => {
    const { calls } = open(<OptionGroupsPage />, MANAGER, () => ({
      status: 200,
      data: GROUP,
    }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Archivar opción Grande" }),
    );
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({ url: "/options/5/archive" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Restaurar opción Viejo" }),
    );
    await waitFor(() =>
      expect(writes(calls).at(-1)).toMatchObject({
        url: "/options/7/restore",
      }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Archivar grupo Extras" }),
    );
    await waitFor(() =>
      expect(writes(calls).at(-1)).toMatchObject({
        url: "/option-groups/2/archive",
      }),
    );
  });

  it("switches an option off at an outlet", async () => {
    const { calls } = open(<OptionGroupsPage />, MANAGER, () => ({
      status: 200,
      data: GROUP,
    }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Sucursales de Grande" }),
    );
    const dialog = await screen.findByRole("dialog");
    const toggle = await within(dialog).findByRole("switch", {
      name: "Centro",
    });
    expect(toggle).toBeChecked();
    await userEvent.click(toggle);
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "PUT",
        url: "/options/5/outlets/7",
        data: { isAvailable: false },
      }),
    );
    await waitFor(() => expect(toggle).not.toBeChecked());
  });

  it("lets the Operator switch availability but not edit", async () => {
    open(<OptionGroupsPage />, OPERATOR);
    expect(
      await screen.findByRole("button", { name: "Sucursales de Grande" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nuevo grupo" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Editar opción Grande" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Archivar opción Grande" }),
    ).toBeNull();
  });

  it("shows nothing to change for a viewer without the extra", async () => {
    open(<OptionGroupsPage />, VIEWER);
    await screen.findByRole("region", { name: "Tamaño" });
    expect(
      screen.queryByRole("button", { name: "Sucursales de Grande" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Nuevo grupo" })).toBeNull();
  });
});

describe("Producto: pestaña Opciones", () => {
  const openTab = async () =>
    userEvent.click(await screen.findByRole("tab", { name: "Opciones" }));

  it("shows attached groups and saves overrides and additions", async () => {
    const { calls } = open(<ProductPage />, MANAGER, () => ({
      status: 200,
      data: PRODUCT,
    }));
    await openTab();
    const table = await screen.findByRole("table", {
      name: "Grupos de opciones del producto",
    });
    expect(await within(table).findByText("Tamaño")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Máximo propio de Tamaño"), "1");
    await userEvent.click(screen.getByLabelText("Agregar grupo"));
    await userEvent.click(
      await screen.findByRole("option", { name: "Extras" }),
    );
    await userEvent.type(screen.getByLabelText("Mínimo propio de Extras"), "1");
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar opciones" }),
    );
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "PUT",
        url: "/products/3/option-groups",
        data: {
          groups: [
            { optionGroupId: 1, minOverride: null, maxOverride: 1 },
            { optionGroupId: 2, minOverride: 1, maxOverride: null },
          ],
        },
      }),
    );
    expect(await screen.findByText("Opciones guardadas.")).toBeInTheDocument();
  });

  it("removes a group", async () => {
    const { calls } = open(<ProductPage />, MANAGER, () => ({
      status: 200,
      data: PRODUCT,
    }));
    await openTab();
    await userEvent.click(
      await screen.findByRole("button", { name: "Quitar Tamaño" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar opciones" }),
    );
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({ data: { groups: [] } }),
    );
  });

  it("checks the overrides before sending", async () => {
    const { calls } = open(<ProductPage />);
    await openTab();
    await userEvent.type(
      await screen.findByLabelText("Mínimo propio de Tamaño"),
      "x",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar opciones" }),
    );
    expect(
      await screen.findByText(/deben ser números enteros/),
    ).toBeInTheDocument();
    expect(writes(calls)).toEqual([]);
  });

  it("explains an invalid selection", async () => {
    open(<ProductPage />, MANAGER, () =>
      apiError(422, "catalog.invalid_selection"),
    );
    await openTab();
    await userEvent.click(
      await screen.findByRole("button", { name: "Guardar opciones" }),
    );
    expect(
      await screen.findByText("La selección de opciones no es válida."),
    ).toBeInTheDocument();
  });

  it("is read-only for a viewer", async () => {
    open(<ProductPage />, VIEWER);
    await openTab();
    expect(
      await screen.findByLabelText("Mínimo propio de Tamaño"),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Guardar opciones" }),
    ).toBeNull();
  });
});

describe("Importar y exportar", () => {
  beforeEach(() => {
    path = "/catalog/import";
  });

  const pick = (file: File) =>
    fireEvent.change(screen.getByLabelText("Archivo CSV"), {
      target: { files: [file] },
    });
  const csv = (name = "catalogo.csv", body = "sku,name,base_price\nA,B,1") =>
    new File([body], name, { type: "text/csv" });

  const job = (status: string, extra: object = {}) => ({
    id: 5,
    kind: "catalog",
    status,
    rowCount: 2,
    errorCount: 0,
    errors: [],
    summary: null,
    failureReason: null,
    createdAt: "2026-11-05T12:00:00Z",
    validatedAt: null,
    appliedAt: null,
    ...extra,
  });
  const UPLOAD = {
    id: 5,
    upload: { url: "https://storage/put", method: "PUT", headers: {} },
  };

  it("exports and offers the download", async () => {
    const { calls } = open(<ImportExportPage />, MANAGER, () => ({
      status: 202,
      data: {
        id: 8,
        kind: "catalog",
        status: "ready",
        rowCount: 12,
        summary: null,
        failureReason: null,
        createdAt: "2026-11-05T12:00:00Z",
        readyAt: "2026-11-05T12:00:01Z",
        expiresAt: "2026-11-06T12:00:00Z",
        downloadUrl: "https://files/catalog.csv",
      },
    }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Exportar catálogo" }),
    );
    const link = await screen.findByRole("link", { name: "Descargar CSV" });
    expect(link).toHaveAttribute("href", "https://files/catalog.csv");
    expect(screen.getByText(/12 productos/)).toBeInTheDocument();
    expect(writes(calls)[0]).toMatchObject({
      method: "POST",
      url: "/export-jobs",
      data: { kind: "catalog" },
    });
  });

  it("waits while the export is being prepared", async () => {
    const base = {
      id: 8,
      kind: "catalog",
      rowCount: 3,
      summary: null,
      failureReason: null,
      createdAt: "2026-11-05T12:00:00Z",
      readyAt: null,
      expiresAt: null,
      downloadUrl: null,
    };
    open(<ImportExportPage />, MANAGER, (call) =>
      call.method === "POST"
        ? { status: 202, data: { ...base, status: "queued" } }
        : {
            status: 200,
            data: {
              ...base,
              status: "ready",
              downloadUrl: "https://files/catalog.csv",
            },
          },
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Exportar catálogo" }),
    );
    expect(await screen.findByLabelText("Preparando el archivo")).toBeVisible();
    expect(
      await screen.findByRole(
        "link",
        { name: "Descargar CSV" },
        { timeout: 4000 },
      ),
    ).toBeInTheDocument();
  }, 8000);

  it("shows a failed export", async () => {
    open(<ImportExportPage />, MANAGER, () => ({
      status: 202,
      data: { id: 8, kind: "catalog", status: "failed", rowCount: null },
    }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Exportar catálogo" }),
    );
    expect(
      await screen.findByText(/No pudimos preparar el archivo/),
    ).toBeInTheDocument();
  });

  it("hides export without the extra and import without full access", async () => {
    open(<ImportExportPage />, VIEWER);
    expect(
      await screen.findByText("Tu rol no puede exportar el catálogo."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Solo un rol con control total/),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Archivo CSV")).toBeNull();
  });

  it("limits import to members with every outlet", async () => {
    open(<ImportExportPage />, {
      ...MANAGER,
      outlets: { all: false, ids: [7] },
    });
    expect(
      await screen.findByText(/Solo un rol con control total/),
    ).toBeInTheDocument();
  });

  it("refuses files that are not CSV, empty or too big", async () => {
    const put = vi.spyOn(axios, "request");
    const { calls } = open(<ImportExportPage />);
    await screen.findByLabelText("Archivo CSV");
    pick(new File(["x"], "a.xlsx"));
    expect(
      await screen.findByText("El archivo debe terminar en .csv."),
    ).toBeInTheDocument();
    pick(csv("a.csv", ""));
    expect(
      await screen.findByText("El archivo está vacío."),
    ).toBeInTheDocument();
    const big = csv();
    Object.defineProperty(big, "size", { value: 6 * 1024 * 1024 });
    pick(big);
    expect(
      await screen.findByText("El archivo pesa más de 5 MB."),
    ).toBeInTheDocument();
    expect(writes(calls)).toEqual([]);
    expect(put).not.toHaveBeenCalled();
  });

  it("uploads, checks, shows the summary and applies", async () => {
    const put = vi.spyOn(axios, "request").mockResolvedValue({ status: 200 });
    let applied = false;
    const { calls } = open(<ImportExportPage />, MANAGER, (call) => {
      if (call.url === "/import-jobs") return { status: 201, data: UPLOAD };
      if (call.url === "/import-jobs/5/complete")
        return { status: 202, data: job("validating") };
      if (call.url === "/import-jobs/5/apply") {
        applied = true;
        return { status: 202, data: job("applying") };
      }
      if (call.url === "/import-jobs/5")
        return {
          status: 200,
          data: applied
            ? job("applied", { summary: { created: 1, updated: 1 } })
            : job("validated", {
                summary: {
                  created: 1,
                  updated: 1,
                  unchanged: 0,
                  categoriesCreated: 2,
                },
              }),
        };
      return { status: 404 };
    });
    await screen.findByLabelText("Archivo CSV");
    pick(csv());
    expect(
      await screen.findByText(/El archivo está bien \(2 filas\)/),
    ).toBeInTheDocument();
    const summary = screen.getByRole("table", { name: "Resumen" });
    expect(within(summary).getByText("Productos nuevos")).toBeInTheDocument();
    expect(within(summary).getByText("Categorías nuevas")).toBeInTheDocument();
    expect(writes(calls)[0]).toMatchObject({
      method: "POST",
      url: "/import-jobs",
      data: { kind: "catalog", sizeBytes: 25 },
    });
    expect(put).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://storage/put", method: "PUT" }),
    );
    expect(writes(calls).some((c) => c.url.endsWith("/apply"))).toBe(false);
    await userEvent.click(
      screen.getByRole("button", { name: "Aplicar importación" }),
    );
    expect(
      await screen.findByText("Importación aplicada."),
    ).toBeInTheDocument();
    expect(writes(calls).at(-1)).toMatchObject({
      method: "POST",
      url: "/import-jobs/5/apply",
    });
  });

  it("lists the errors of a file that did not pass", async () => {
    vi.spyOn(axios, "request").mockResolvedValue({ status: 200 });
    open(<ImportExportPage />, MANAGER, (call) => {
      if (call.url === "/import-jobs") return { status: 201, data: UPLOAD };
      if (call.url === "/import-jobs/5/complete")
        return { status: 202, data: job("validating") };
      return {
        status: 200,
        data: job("invalid", {
          errorCount: 3,
          errors: [
            {
              row: 2,
              column: "base_price",
              code: "import.invalid_price",
              message: "x",
              ctx: {},
            },
            {
              row: 3,
              column: null,
              code: "catalog.sku_taken",
              message: "x",
              ctx: {},
            },
          ],
        }),
      };
    });
    await screen.findByLabelText("Archivo CSV");
    pick(csv());
    expect(
      await screen.findByText(
        "Hay 3 errores. No se guardó nada; corrige el archivo y súbelo de nuevo.",
      ),
    ).toBeInTheDocument();
    const report = screen.getByRole("table", { name: "Errores del archivo" });
    const first = within(report).getByText("base_price").closest("tr")!;
    expect(within(first).getByText("2")).toBeInTheDocument();
    expect(within(first).getByText(/Precio no válido/)).toBeInTheDocument();
    expect(
      within(report).getByText("Otro producto ya usa ese SKU."),
    ).toBeInTheDocument();
    expect(screen.getByText("Se muestran 2 de 3 errores.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Aplicar importación" }),
    ).toBeNull();
  });

  it("says when storage refuses the file", async () => {
    vi.spyOn(axios, "request").mockRejectedValue(new Error("403"));
    const { calls } = open(<ImportExportPage />, MANAGER, () => ({
      status: 201,
      data: UPLOAD,
    }));
    await screen.findByLabelText("Archivo CSV");
    pick(csv());
    expect(
      await screen.findByText("No pudimos subir el archivo. Intenta de nuevo."),
    ).toBeInTheDocument();
    expect(writes(calls).map((c) => c.url)).toEqual(["/import-jobs"]);
  });

  it("explains a refusal from the API", async () => {
    open(<ImportExportPage />, MANAGER, () =>
      apiError(422, "import.too_large"),
    );
    await screen.findByLabelText("Archivo CSV");
    pick(csv());
    expect(
      await screen.findByText("El archivo pesa demasiado. El máximo es 5 MB."),
    ).toBeInTheDocument();
  });
});
