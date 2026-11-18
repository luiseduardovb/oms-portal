import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { http } from "@/api/http";
import { sessionStarted } from "@/auth/sessionSlice";
import { setAccessToken } from "@/auth/tokenStore";
import { makeStore } from "@/store";
import ZonePage from "../src/app/(app)/setup/delivery/zones/[id]/page";
import NewZonePage from "../src/app/(app)/setup/delivery/zones/new/page";
import DeliveryPage from "../src/app/(app)/setup/delivery/page";
import { apiError, fakeApi, ME } from "./fakeApi";
import { renderWithProviders } from "./render";

const push = vi.hoisted(() => vi.fn());
const route = vi.hoisted(() => ({ id: "3" as string | undefined }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push }),
  useParams: () => (route.id ? { id: route.id } : {}),
  useSearchParams: () => new URLSearchParams("outlet=7"),
  usePathname: () => "/setup/delivery",
}));

// The real map needs Google; here a stand-in lets a test click it.
vi.mock("@/delivery/DeliveryMap", () => ({
  DeliveryMap: (props: {
    dispatch?: (action: object) => void;
    onProbe?: (point: { lat: number; lng: number }) => void;
  }) => (
    <div>
      {props.onProbe && (
        <button onClick={() => props.onProbe!({ lat: 14.08, lng: -87.19 })}>
          mapa: probar punto
        </button>
      )}
      {props.dispatch && (
        <>
          <button
            onClick={() => props.dispatch!({ type: "add", point: [-87.2, 14] })}
          >
            mapa: punto 1
          </button>
          <button
            onClick={() => props.dispatch!({ type: "add", point: [-87.1, 14] })}
          >
            mapa: punto 2
          </button>
          <button
            onClick={() =>
              props.dispatch!({ type: "add", point: [-87.1, 14.1] })
            }
          >
            mapa: punto 3
          </button>
          <button
            onClick={() =>
              props.dispatch!({ type: "center", point: [-87.15, 14.05] })
            }
          >
            mapa: centro
          </button>
        </>
      )}
    </div>
  ),
}));
vi.mock("@/delivery/PlaceSearch", () => ({
  PlaceSearch: (props: {
    onPick: (place: { lat: number; lng: number; label: string }) => void;
  }) => (
    <button
      onClick={() =>
        props.onPick({ lat: 14.07, lng: -87.19, label: "Kennedy" })
      }
    >
      buscar: elegir Kennedy
    </button>
  ),
}));

const RING = [
  [-87.2, 14],
  [-87.1, 14],
  [-87.1, 14.1],
  [-87.2, 14.1],
  [-87.2, 14],
];

function zone(id: number, name: string, extra: object = {}) {
  return {
    id,
    outletId: 7,
    name,
    polygon: RING,
    fee: "40.00",
    minOrder: "150.00",
    etaMinutes: 30,
    freeOver: null,
    sortOrder: id,
    isActive: true,
    ...extra,
  };
}

const ZONES = [
  zone(3, "Cerca"),
  zone(4, "Lejos", { fee: "60.00", freeOver: "400.00", isActive: false }),
];

const OUTLET = {
  id: 7,
  name: "Centro",
  archivedAt: null,
  deliveryEnabled: true,
  deliveryMode: "zones",
  deliveryFee: "35.00",
  deliveryMinOrder: "100.00",
  deliveryEtaMinutes: 40,
  latitude: "14.072300",
  longitude: "-87.192100",
};

const MANAGER = { ...ME, levels: { ...ME.levels, setup: "full" } };
const VIEWER = { ...ME, levels: { ...ME.levels, setup: "view" } };

function open(
  View: () => ReactElement,
  me: object = MANAGER,
  overrides: Parameters<typeof fakeApi>[1] = () => ({ status: 404 }),
  outlet: object = OUTLET,
  zones: object[] = ZONES,
) {
  const store = makeStore();
  store.dispatch(sessionStarted());
  setAccessToken("token");
  const api = fakeApi(http, (call) => {
    if (call.url === "/me") return { status: 200, data: me };
    if (call.url === "/outlets" && call.method === "GET")
      return { status: 200, data: [OUTLET] };
    if (call.url === "/outlets/7" && call.method === "GET")
      return { status: 200, data: outlet };
    if (call.url === "/outlets/7/delivery-zones" && call.method === "GET")
      return { status: 200, data: zones };
    if (call.url === "/merchant/settings") {
      return { status: 200, data: { country: { currencyCode: "HNL" } } };
    }
    return overrides(call);
  });
  renderWithProviders(<View />, store);
  return api;
}

afterEach(() => {
  setAccessToken(null);
  push.mockReset();
  route.id = "3";
});

describe("Delivery page", () => {
  it("lists the zones with their fee, minimum, time and state", async () => {
    open(() => <DeliveryPage />);
    const row = (await screen.findByText("Cerca")).closest("tr")!;
    expect(within(row).getByText("L 40.00")).toBeInTheDocument();
    expect(within(row).getByText("L 150.00")).toBeInTheDocument();
    expect(within(row).getByText("30 min")).toBeInTheDocument();
    expect(within(row).getByText("Activa")).toBeInTheDocument();
    const far = screen.getByText("Lejos").closest("tr")!;
    expect(within(far).getByText("Desactivada")).toBeInTheDocument();
    expect(within(far).getByText("Gratis desde L 400.00")).toBeInTheDocument();
  });

  it("shows the flat fee when the branch is on a single rate", async () => {
    open(
      () => <DeliveryPage />,
      MANAGER,
      () => ({ status: 404 }),
      {
        ...OUTLET,
        deliveryMode: "flat",
      },
    );
    expect(await screen.findByText(/Tarifa de envío: L 35.00/)).toBeVisible();
    expect(screen.queryByText("Cerca")).toBeNull();
  });

  it("switches the branch to zones", async () => {
    const { calls } = open(
      () => <DeliveryPage />,
      MANAGER,
      (call) =>
        call.method === "PATCH"
          ? { status: 200, data: { ...OUTLET, deliveryMode: "flat" } }
          : { status: 404 },
      { ...OUTLET, deliveryMode: "flat" },
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Por zonas" }),
    );
    await waitFor(() =>
      expect(calls.find((c) => c.method === "PATCH")).toMatchObject({
        url: "/outlets/7",
        data: { deliveryMode: "zones" },
      }),
    );
  });

  it("moves a zone up and down", async () => {
    const { calls } = open(
      () => <DeliveryPage />,
      MANAGER,
      (call) =>
        call.method === "PUT" ? { status: 200, data: ZONES } : { status: 404 },
    );
    await screen.findByText("Cerca");
    await userEvent.click(screen.getByRole("button", { name: "Bajar Cerca" }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === "PUT")).toMatchObject({
        url: "/outlets/7/delivery-zones/order",
        data: { ids: [4, 3] },
      }),
    );
  });

  it("activates, deactivates and removes from the row menu", async () => {
    const { calls } = open(
      () => <DeliveryPage />,
      MANAGER,
      (call) =>
        call.method === "DELETE"
          ? { status: 204 }
          : { status: 200, data: ZONES[0] },
    );
    const row = (await screen.findByText("Cerca")).closest("tr")!;
    const menu = () =>
      userEvent.click(
        within(row).getByRole("button", { name: "Más acciones de Cerca" }),
      );
    await menu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Desactivar" }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === "PUT")).toMatchObject({
        url: "/outlets/7/delivery-zones/3",
        data: { name: "Cerca", isActive: false, polygon: RING, fee: "40.00" },
      }),
    );
    await menu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Eliminar" }));
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Eliminar",
      }),
    );
    await waitFor(() =>
      expect(calls.find((c) => c.method === "DELETE")).toMatchObject({
        url: "/outlets/7/delivery-zones/3",
      }),
    );
  });

  it("tests an address from the search and from the map", async () => {
    const { calls } = open(
      () => <DeliveryPage />,
      MANAGER,
      (call) =>
        call.url.endsWith("/check")
          ? call.params?.latitude === 14.07
            ? {
                status: 200,
                data: {
                  covered: true,
                  zoneId: 3,
                  zoneName: "Cerca",
                  fee: "40.00",
                  minOrder: "150.00",
                  etaMinutes: 30,
                  freeOver: null,
                },
              }
            : {
                status: 200,
                data: {
                  covered: false,
                  fee: "0.00",
                  minOrder: "0.00",
                  etaMinutes: 40,
                },
              }
          : { status: 404 },
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "buscar: elegir Kennedy" }),
    );
    expect(
      await screen.findByText(
        /Sí entrega: Cerca. Envío L 40.00, mínimo L 150.00/,
      ),
    ).toBeVisible();
    expect(calls.find((c) => c.url.endsWith("/check"))?.params).toEqual({
      latitude: 14.07,
      longitude: -87.19,
    });
    await userEvent.click(
      screen.getByRole("button", { name: "mapa: probar punto" }),
    );
    expect(await screen.findByText("No entrega a ese punto.")).toBeVisible();
  });

  it("is read-only for someone who can only view", async () => {
    open(() => <DeliveryPage />, VIEWER);
    await screen.findByText("Cerca");
    expect(screen.getByText(/Solo puedes ver esta página/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Agregar zona" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Subir Cerca" })).toBeNull();
  });

  it("says so when a branch has no zones yet", async () => {
    open(
      () => <DeliveryPage />,
      MANAGER,
      () => ({ status: 404 }),
      OUTLET,
      [],
    );
    expect(await screen.findByText(/no tiene zonas todavía/)).toBeVisible();
  });
});

describe("Zone form", () => {
  async function fill(name: string, fee: string) {
    await userEvent.type(
      await screen.findByLabelText("Nombre de la zona"),
      name,
    );
    await userEvent.type(screen.getByLabelText("Tarifa de envío"), fee);
    const min = screen.getByLabelText("Pedido mínimo");
    await userEvent.clear(min);
    await userEvent.type(min, "100");
  }

  it("creates a zone drawn point by point", async () => {
    route.id = undefined;
    const { calls } = open(
      () => <NewZonePage />,
      MANAGER,
      (call) =>
        call.method === "POST"
          ? { status: 201, data: zone(9, "Nueva") }
          : { status: 404 },
    );
    await fill("Nueva", "45");
    for (const n of [1, 2, 3]) {
      await userEvent.click(
        screen.getByRole("button", { name: `mapa: punto ${n}` }),
      );
    }
    await userEvent.click(screen.getByRole("button", { name: "Cerrar zona" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar zona" }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === "POST")).toMatchObject({
        url: "/outlets/7/delivery-zones",
        data: {
          name: "Nueva",
          polygon: [
            [-87.2, 14],
            [-87.1, 14],
            [-87.1, 14.1],
          ],
          fee: "45",
          minOrder: "100",
          etaMinutes: 40,
          freeOver: null,
          isActive: true,
        },
      }),
    );
    expect(push).toHaveBeenCalledWith("/setup/delivery?outlet=7");
  });

  it("creates a circle zone", async () => {
    route.id = undefined;
    const { calls } = open(
      () => <NewZonePage />,
      MANAGER,
      (call) =>
        call.method === "POST"
          ? { status: 201, data: zone(9, "Redonda") }
          : { status: 404 },
    );
    await fill("Redonda", "30");
    await userEvent.click(
      await screen.findByRole("button", { name: "Círculo" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "mapa: centro" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar zona" }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === "POST")?.data).toMatchObject({
        name: "Redonda",
        circle: { latitude: 14.05, longitude: -87.15, radiusMeters: 2000 },
      }),
    );
    expect(
      (calls.find((c) => c.method === "POST")?.data as { polygon?: unknown })
        .polygon,
    ).toBeUndefined();
  });

  it("asks for the missing pieces and does not save", async () => {
    route.id = undefined;
    const { calls } = open(() => <NewZonePage />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Guardar zona" }),
    );
    expect(
      await screen.findAllByText("Este dato es obligatorio."),
    ).not.toHaveLength(0);
    expect(
      screen.getByText("Una zona necesita al menos 3 puntos."),
    ).toBeVisible();
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("free delivery needs an amount", async () => {
    route.id = undefined;
    open(() => <NewZonePage />);
    await userEvent.click(
      await screen.findByLabelText("Envío gratis desde cierto monto"),
    );
    await userEvent.click(screen.getByRole("button", { name: "Guardar zona" }));
    expect(
      await screen.findAllByText(
        "Escribe un monto válido, con hasta 2 decimales.",
      ),
    ).not.toHaveLength(0);
  });

  it("edits a zone and shows the API's refusal", async () => {
    const { calls } = open(
      () => <ZonePage />,
      MANAGER,
      (call) =>
        call.method === "PUT"
          ? apiError(409, "delivery.zone_name_taken")
          : { status: 404 },
    );
    const name = await screen.findByLabelText("Nombre de la zona");
    expect(name).toHaveValue("Cerca");
    expect(screen.getByLabelText("Tarifa de envío")).toHaveValue("40.00");
    await userEvent.clear(name);
    await userEvent.type(name, "Lejos");
    await userEvent.click(screen.getByRole("button", { name: "Guardar zona" }));
    expect(
      await screen.findByText("Otra zona de esta sucursal ya usa ese nombre."),
    ).toBeVisible();
    expect(calls.find((c) => c.method === "PUT")).toMatchObject({
      url: "/outlets/7/delivery-zones/3",
      data: { name: "Lejos", polygon: RING.slice(0, 4) },
    });
    expect(push).not.toHaveBeenCalled();
  });

  it("refuses someone without full access to setup", async () => {
    open(() => <ZonePage />, VIEWER);
    expect(
      await screen.findByText(/No tienes permiso para ver las entregas/),
    ).toBeVisible();
  });
});
