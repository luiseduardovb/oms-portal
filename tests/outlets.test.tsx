import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http } from "@/api/http";
import { sessionStarted } from "@/auth/sessionSlice";
import { setAccessToken } from "@/auth/tokenStore";
import { makeStore } from "@/store";
import OutletPage from "../src/app/(app)/outlets/[id]/page";
import OutletsPage from "../src/app/(app)/outlets/page";
import { apiError, fakeApi, ME } from "./fakeApi";
import { renderWithProviders } from "./render";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/outlets",
  useParams: () => ({ id: "7" }),
}));

const SUMMARY = {
  id: 7,
  name: "Centro",
  addressText: "Av. Principal",
  phone: "+50499998888",
  timezone: "America/Tegucigalpa",
  isPublic: false,
  pickupEnabled: true,
  deliveryEnabled: true,
  isBusy: false,
  archivedAt: null,
};
const OLD = {
  ...SUMMARY,
  id: 8,
  name: "Viejo",
  archivedAt: "2026-10-01T00:00:00Z",
};

const DETAIL = {
  ...SUMMARY,
  referenceNotes: null,
  latitude: null,
  longitude: null,
  prepTimeMinutes: 20,
  acceptAlertMinutes: 3,
  expireUnacceptedMinutes: 15,
  autoAccept: false,
  deliveryFee: "35.00",
  deliveryMinOrder: "0.00",
  deliveryEtaMinutes: 40,
  hours: [{ weekday: 1, opensAt: "08:00:00", closesAt: "22:00:00" }],
  exceptions: [],
  alertContacts: [],
};

const MANAGER = { ...ME, levels: { ...ME.levels, setup: "full" } };
const LIMITED = {
  ...MANAGER,
  outlets: { all: false, ids: [7] },
};
const VIEWER = { ...ME, levels: { ...ME.levels, setup: "view" } };

type Handler = Parameters<typeof fakeApi>[1];

function open(
  ui: React.ReactElement,
  me: object = MANAGER,
  overrides: Handler = () => ({ status: 200, data: DETAIL }),
  detail: object = DETAIL,
) {
  const store = makeStore();
  store.dispatch(sessionStarted());
  setAccessToken("token");
  const api = fakeApi(http, (call) => {
    if (call.url === "/me") return { status: 200, data: me };
    if (call.url === "/outlets" && call.method === "GET")
      return {
        status: 200,
        data: call.params?.includeArchived ? [SUMMARY, OLD] : [SUMMARY],
      };
    if (call.url === "/outlets/7" && call.method === "GET")
      return { status: 200, data: detail };
    return overrides(call);
  });
  renderWithProviders(ui, store);
  return api;
}

const writes = <T extends { method: string }>(calls: T[]) =>
  calls.filter((c) => c.method !== "GET");

beforeEach(() => push.mockClear());
afterEach(() => setAccessToken(null));

describe("Sucursales list", () => {
  it("lists outlets and shows archived ones on request", async () => {
    open(<OutletsPage />);
    const list = await screen.findByRole("list", { name: "Sucursales" });
    expect(within(list).getByText("Centro")).toBeInTheDocument();
    expect(within(list).getByText("Privada")).toBeInTheDocument();
    expect(within(list).queryByText("Viejo")).toBeNull();
    await userEvent.click(screen.getByLabelText("Mostrar archivadas"));
    const card = (await screen.findByText("Viejo")).closest(
      "[role=listitem]",
    ) as HTMLElement;
    expect(within(card).getByText("Archivada")).toBeInTheDocument();
    expect(
      within(card).getByRole("button", { name: "Restaurar Viejo" }),
    ).toBeInTheDocument();
  });

  it("creates an outlet from its name and opens it", async () => {
    const { calls } = open(<OutletsPage />, MANAGER, (call) =>
      call.method === "POST"
        ? { status: 201, data: { ...DETAIL, id: 9, name: "Norte" } }
        : { status: 200, data: [] },
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Nueva sucursal" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Crear" }));
    expect(
      await screen.findByText("Ingresa el nombre de la sucursal."),
    ).toBeInTheDocument();
    expect(writes(calls)).toEqual([]);
    await userEvent.type(
      screen.getByLabelText("Nombre de la sucursal"),
      "Norte",
    );
    await userEvent.click(screen.getByRole("button", { name: "Crear" }));
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "POST",
        url: "/outlets",
        data: { name: "Norte", pickupEnabled: true, deliveryFee: 0 },
      }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/outlets/9"));
  });

  it("explains a taken name", async () => {
    open(<OutletsPage />, MANAGER, (call) =>
      call.method === "POST"
        ? apiError(409, "outlet.name_taken")
        : { status: 200, data: [] },
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Nueva sucursal" }),
    );
    await userEvent.type(
      screen.getByLabelText("Nombre de la sucursal"),
      "Centro",
    );
    await userEvent.click(screen.getByRole("button", { name: "Crear" }));
    expect(
      await screen.findByText("Otra sucursal ya usa ese nombre."),
    ).toBeInTheDocument();
  });

  it("does not offer to add or restore to a member limited to some outlets", async () => {
    open(<OutletsPage />, LIMITED);
    await screen.findByRole("list", { name: "Sucursales" });
    expect(screen.queryByRole("button", { name: "Nueva sucursal" })).toBeNull();
    await userEvent.click(screen.getByLabelText("Mostrar archivadas"));
    await screen.findByText("Viejo");
    expect(screen.queryByRole("button", { name: "Restaurar" })).toBeNull();
  });

  it("is closed without the setup area", async () => {
    open(<OutletsPage />, { ...ME, levels: { orders: "full" } });
    expect(
      await screen.findByText("No tienes permiso para ver las sucursales."),
    ).toBeInTheDocument();
  });
});

describe("Outlet data", () => {
  it("sends only what changed", async () => {
    const { calls } = open(<OutletPage />);
    const name = await screen.findByLabelText("Nombre");
    expect(name).toHaveValue("Centro");
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    expect(writes(calls)).toEqual([]);
    await userEvent.clear(name);
    await userEvent.type(name, "Centro 2");
    await userEvent.click(
      screen.getByLabelText("Ocupada (pausa temporal de pedidos)"),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "PATCH",
        url: "/outlets/7",
        data: { name: "Centro 2", isBusy: true },
      }),
    );
    expect(Object.keys(writes(calls)[0]!.data as object).sort()).toEqual([
      "isBusy",
      "name",
    ]);
  });

  it("rounds map coordinates to the 6 decimals the API keeps", async () => {
    const { calls } = open(<OutletPage />);
    await userEvent.type(
      await screen.findByLabelText("Latitud"),
      "14.07227512",
    );
    await userEvent.type(screen.getByLabelText("Longitud"), "-87.19213912");
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "PATCH",
        data: { latitude: 14.072275, longitude: -87.192139 },
      }),
    );
  });

  it("checks values before sending", async () => {
    const { calls } = open(<OutletPage />);
    await userEvent.type(await screen.findByLabelText("Teléfono"), "99998888");
    await userEvent.type(screen.getByLabelText("Latitud"), "14.07");
    const expire = screen.getByLabelText(
      "Vencer pedidos sin aceptar en (minutos)",
    );
    await userEvent.clear(expire);
    await userEvent.type(expire, "2");
    const fee = screen.getByLabelText("Costo de envío");
    await userEvent.clear(fee);
    await userEvent.type(fee, "-5");
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    expect(
      await screen.findByText(/Usa el formato internacional/),
    ).toBeVisible();
    expect(
      screen.getByText("Ingresa latitud y longitud, o ninguna."),
    ).toBeVisible();
    expect(
      screen.getByText("El aviso debe llegar antes de que el pedido venza."),
    ).toBeVisible();
    expect(screen.getByText(/Ingresa un monto válido/)).toBeVisible();
    expect(writes(calls)).toEqual([]);
  });

  it("lists what is missing when it cannot go public", async () => {
    open(<OutletPage />, MANAGER, (call) =>
      call.method === "PATCH"
        ? {
            status: 422,
            data: {
              detail: {
                code: "outlet.not_ready",
                message: "x",
                ctx: { missing: ["address", "hours"] },
              },
            },
          }
        : { status: 200, data: DETAIL },
    );
    await userEvent.click(
      await screen.findByLabelText(
        "Sucursal pública (los clientes pueden pedir)",
      ),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    expect(
      await screen.findByText(/Una sucursal pública necesita/),
    ).toBeInTheDocument();
    expect(screen.getByText("Falta la dirección.")).toBeInTheDocument();
    expect(
      screen.getByText("Falta el horario de atención."),
    ).toBeInTheDocument();
  });

  it("archives only after confirming", async () => {
    const { calls } = open(<OutletPage />, MANAGER, (call) =>
      call.method === "POST"
        ? {
            status: 200,
            data: { ...DETAIL, archivedAt: "2026-11-05T00:00:00Z" },
          }
        : { status: 200, data: DETAIL },
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Archivar sucursal" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(writes(calls)).toEqual([]);
    await userEvent.click(
      await screen.findByRole("button", { name: "Archivar sucursal" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Sí, archivar" }));
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "POST",
        url: "/outlets/7/archive",
      }),
    );
  });

  it("is read-only when archived and can be restored", async () => {
    const archived = { ...DETAIL, archivedAt: "2026-11-05T00:00:00Z" };
    const { calls } = open(
      <OutletPage />,
      MANAGER,
      () => ({ status: 200, data: DETAIL }),
      archived,
    );
    expect(await screen.findByLabelText("Nombre")).toBeDisabled();
    expect(
      screen.getByText(
        "Esta sucursal está archivada. Restáurala para editarla.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Guardar cambios" }),
    ).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Restaurar" }));
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "POST",
        url: "/outlets/7/restore",
      }),
    );
  });

  it("is read-only with view access", async () => {
    const { calls } = open(<OutletPage />, VIEWER);
    expect(await screen.findByLabelText("Nombre")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Guardar cambios" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Archivar sucursal" }),
    ).toBeNull();
    expect(writes(calls)).toEqual([]);
  });
});

describe("Opening hours", () => {
  async function hours(handler?: Handler) {
    const api = open(<OutletPage />, MANAGER, handler);
    await userEvent.click(await screen.findByRole("tab", { name: "Horario" }));
    await screen.findByLabelText("Abre Lunes 1");
    return api;
  }
  const save = () =>
    userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  const setTime = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });

  it("shows the week and saves a changed interval", async () => {
    const { calls } = await hours();
    expect(screen.getByLabelText("Abre Lunes 1")).toHaveValue("08:00");
    await userEvent.click(
      screen.getByRole("button", { name: "Agregar horario Martes" }),
    );
    setTime("Abre Martes 1", "10:00");
    setTime("Cierra Martes 1", "14:00");
    await save();
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "PUT",
        url: "/outlets/7/hours",
        data: {
          hours: [
            { weekday: 1, opensAt: "08:00", closesAt: "22:00" },
            { weekday: 2, opensAt: "10:00", closesAt: "14:00" },
          ],
        },
      }),
    );
  });

  it("stops overlapping intervals and says which days", async () => {
    const { calls } = await hours();
    await userEvent.click(
      screen.getByRole("button", { name: "Agregar horario Lunes" }),
    );
    setTime("Abre Lunes 2", "20:00");
    setTime("Cierra Lunes 2", "23:00");
    await save();
    expect(
      await screen.findByText(
        "Los horarios del Lunes y del Lunes se traslapan.",
      ),
    ).toBeVisible();
    expect(writes(calls)).toEqual([]);
  });

  it("sees a late night running into the next morning", async () => {
    const { calls } = await hours();
    await userEvent.click(
      screen.getByRole("button", { name: "Agregar horario Domingo" }),
    );
    setTime("Abre Domingo 1", "22:00");
    setTime("Cierra Domingo 1", "09:00");
    expect(screen.getByText("cierra al día siguiente")).toBeVisible();
    await save();
    expect(
      await screen.findByText(
        "Los horarios del Domingo y del Lunes se traslapan.",
      ),
    ).toBeVisible();
    expect(writes(calls)).toEqual([]);
  });

  it("refuses equal opening and closing times", async () => {
    const { calls } = await hours();
    setTime("Cierra Lunes 1", "08:00");
    await save();
    expect(await screen.findByText(/deben ser distintas/)).toBeVisible();
    expect(writes(calls)).toEqual([]);
  });

  it("copies a day to other days", async () => {
    const { calls } = await hours();
    await userEvent.click(
      screen.getByRole("button", { name: "Copiar a otros días Lunes" }),
    );
    await userEvent.click(await screen.findByLabelText("Martes"));
    await userEvent.click(screen.getByLabelText("Miércoles"));
    await userEvent.click(screen.getByRole("button", { name: "Copiar" }));
    // The dialog is still closing, so wait for the page to be reachable.
    await userEvent.click(
      await screen.findByRole("button", { name: "Guardar cambios" }),
    );
    await waitFor(() => {
      const body = writes(calls)[0]!.data as { hours: { weekday: number }[] };
      expect(body.hours.map((h) => h.weekday)).toEqual([1, 2, 3]);
    });
  });
});

describe("Date exceptions", () => {
  async function exceptions() {
    const api = open(<OutletPage />);
    await userEvent.click(
      await screen.findByRole("tab", { name: "Excepciones" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Agregar excepción" }),
    );
    return api;
  }
  const save = () =>
    userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

  it("saves a closed day", async () => {
    const { calls } = await exceptions();
    fireEvent.change(screen.getByLabelText("Fecha 1"), {
      target: { value: "2099-12-25" },
    });
    await userEvent.type(screen.getByLabelText("Motivo 1"), "Navidad");
    await save();
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "PUT",
        url: "/outlets/7/hour-exceptions",
        data: {
          exceptions: [
            {
              onDate: "2099-12-25",
              isClosed: true,
              opensAt: null,
              closesAt: null,
              reason: "Navidad",
            },
          ],
        },
      }),
    );
  });

  it("saves a day with different hours", async () => {
    const { calls } = await exceptions();
    fireEvent.change(screen.getByLabelText("Fecha 1"), {
      target: { value: "2099-12-31" },
    });
    await userEvent.click(screen.getByLabelText("Cerrado 1"));
    fireEvent.change(screen.getByLabelText("Abre 1"), {
      target: { value: "10:00" },
    });
    fireEvent.change(screen.getByLabelText("Cierra 1"), {
      target: { value: "14:00" },
    });
    await save();
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        data: {
          exceptions: [
            {
              onDate: "2099-12-31",
              isClosed: false,
              opensAt: "10:00",
              closesAt: "14:00",
            },
          ],
        },
      }),
    );
  });

  it("refuses past and missing dates", async () => {
    const { calls } = await exceptions();
    await save();
    expect(
      await screen.findByText("Elige la fecha de cada excepción."),
    ).toBeVisible();
    fireEvent.change(screen.getByLabelText("Fecha 1"), {
      target: { value: "2020-01-01" },
    });
    await save();
    expect(
      await screen.findByText("Las excepciones deben ser de hoy en adelante."),
    ).toBeVisible();
    expect(writes(calls)).toEqual([]);
  });

  it("refuses two exceptions on one date", async () => {
    const { calls } = await exceptions();
    await userEvent.click(
      screen.getByRole("button", { name: "Agregar excepción" }),
    );
    for (const n of [1, 2])
      fireEvent.change(screen.getByLabelText(`Fecha ${n}`), {
        target: { value: "2099-12-25" },
      });
    await save();
    expect(
      await screen.findByText("Solo puede haber una excepción por fecha."),
    ).toBeVisible();
    expect(writes(calls)).toEqual([]);
  });
});

describe("Alert contacts", () => {
  async function contacts() {
    const api = open(<OutletPage />);
    await userEvent.click(await screen.findByRole("tab", { name: "Alertas" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Agregar número" }),
    );
    return api;
  }
  const save = () =>
    userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

  it("saves numbers in international format", async () => {
    const { calls } = await contacts();
    await userEvent.type(screen.getByLabelText("Teléfono 1"), "+50499998888");
    await userEvent.type(screen.getByLabelText("Nombre 1"), "Cocina");
    await save();
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "PUT",
        url: "/outlets/7/alert-contacts",
        data: {
          alertContacts: [
            { phone: "+50499998888", label: "Cocina", active: true },
          ],
        },
      }),
    );
  });

  it("refuses bad and repeated numbers", async () => {
    const { calls } = await contacts();
    await userEvent.type(screen.getByLabelText("Teléfono 1"), "99998888");
    await save();
    expect(
      await screen.findByText(/Usa el formato internacional/),
    ).toBeVisible();
    await userEvent.clear(screen.getByLabelText("Teléfono 1"));
    await userEvent.type(screen.getByLabelText("Teléfono 1"), "+50499998888");
    await userEvent.click(
      screen.getByRole("button", { name: "Agregar número" }),
    );
    await userEvent.type(screen.getByLabelText("Teléfono 2"), "+50499998888");
    await save();
    expect(
      await screen.findByText("Cada número se puede agregar una sola vez."),
    ).toBeVisible();
    expect(writes(calls)).toEqual([]);
  });

  it("allows at most five numbers", async () => {
    await contacts();
    for (let n = 0; n < 4; n += 1)
      await userEvent.click(
        screen.getByRole("button", { name: "Agregar número" }),
      );
    expect(
      screen.getByRole("button", { name: "Agregar número" }),
    ).toBeDisabled();
  });
});
