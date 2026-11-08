import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { http } from "@/api/http";
import { sessionStarted } from "@/auth/sessionSlice";
import { setAccessToken } from "@/auth/tokenStore";
import { formatTipPresets, parseTipPresets } from "@/setup/tips";
import { makeStore } from "@/store";
import SetupPage from "../src/app/(app)/setup/page";
import { apiError, fakeApi, ME } from "./fakeApi";
import { renderWithProviders } from "./render";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/setup",
}));

const SETUP = {
  name: "Café Uno",
  slug: "cafe-uno",
  status: "draft",
  timezone: "America/Tegucigalpa",
  country: {
    code: "HN",
    name: "Honduras",
    currencyCode: "HNL",
    timezone: "America/Tegucigalpa",
  },
  tax: {
    label: "ISV",
    ratePercent: "15.00",
    effectiveFrom: "2000-01-01T00:00:00Z",
  },
  settings: {
    pageTitle: null,
    slogan: null,
    primaryColor: null,
    hideStoreName: false,
    asapEnabled: true,
    scheduledEnabled: false,
    slotIntervalMinutes: 30,
    maxScheduleDays: 7,
    tipsEnabled: false,
    tipPresetsPercent: [],
    contactPhone: null,
    contactWhatsapp: null,
    contactEmail: null,
    instagramUrl: null,
    facebookUrl: null,
    websiteUrl: null,
  },
  paymentMethods: { cashOnDelivery: true, cardOnDelivery: true },
};

const MANAGER = { ...ME, levels: { ...ME.levels, setup: "full" } };
const OWNER = { ...MANAGER, isOwner: true };
const VIEWER = { ...ME, levels: { ...ME.levels, setup: "view" } };

function setup(
  me: object = MANAGER,
  overrides: Parameters<typeof fakeApi>[1] = () => ({
    status: 200,
    data: SETUP,
  }),
) {
  const store = makeStore();
  store.dispatch(sessionStarted());
  setAccessToken("token");
  const api = fakeApi(http, (call) => {
    if (call.url === "/me") return { status: 200, data: me };
    if (call.url === "/merchant/settings" && call.method === "GET")
      return { status: 200, data: SETUP };
    return overrides(call);
  });
  renderWithProviders(<SetupPage />, store);
  return api;
}

const writes = (calls: { method: string }[]) =>
  calls.filter((c) => c.method !== "GET");

afterEach(() => setAccessToken(null));

describe("Configuración", () => {
  it("shows the store, country and the tax that the platform sets", async () => {
    setup();
    expect(await screen.findByLabelText("Nombre del negocio")).toHaveValue(
      "Café Uno",
    );
    expect(screen.getByText(/País: Honduras/)).toBeInTheDocument();
    expect(screen.getByText(/ISV 15.00% desde el/)).toBeInTheDocument();
    expect(screen.getByText(/no se puede cambiar aquí/)).toBeInTheDocument();
    // Tax has no field at all.
    expect(screen.queryByLabelText(/impuesto/i)).toBeNull();
  });

  it("is closed to roles without the setup area", async () => {
    setup({ ...ME, levels: { orders: "full" } });
    expect(
      await screen.findByText("No tienes permiso para ver la configuración."),
    ).toBeInTheDocument();
  });

  it("is read-only with view access", async () => {
    const { calls } = setup(VIEWER);
    const name = await screen.findByLabelText("Nombre del negocio");
    expect(name).toBeDisabled();
    expect(screen.getByText(/pero no cambiarla/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Guardar cambios" }),
    ).toBeNull();
    await userEvent.click(screen.getByRole("tab", { name: "Pagos" }));
    expect(await screen.findByLabelText("Efectivo al recibir")).toBeDisabled();
    expect(writes(calls)).toEqual([]);
  });

  it("renames the business", async () => {
    const { calls } = setup();
    const name = await screen.findByLabelText("Nombre del negocio");
    await userEvent.clear(name);
    await userEvent.type(name, "Café Dos");
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "PATCH",
        url: "/merchant",
        data: { name: "Café Dos" },
      }),
    );
    expect(await screen.findByText("Cambios guardados.")).toBeInTheDocument();
  });

  it("will not save an empty name", async () => {
    const { calls } = setup();
    const name = await screen.findByLabelText("Nombre del negocio");
    await userEvent.clear(name);
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    expect(
      await screen.findByText("Ingresa el nombre del negocio."),
    ).toBeInTheDocument();
    expect(writes(calls)).toEqual([]);
  });

  it("lets only an owner change the store address, after confirming", async () => {
    const manager = setup();
    expect(await screen.findByLabelText("Dirección")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Cambiar dirección" }),
    ).toBeNull();
    expect(writes(manager.calls)).toEqual([]);
  });

  it("changes the address only when the owner confirms", async () => {
    const { calls } = setup(OWNER, () => ({ status: 200, data: SETUP }));
    const slug = await screen.findByLabelText("Dirección");
    expect(slug).toBeEnabled();
    // Unchanged: nothing to confirm.
    await userEvent.click(
      screen.getByRole("button", { name: "Cambiar dirección" }),
    );
    expect(
      screen.queryByText("¿Cambiar la dirección de tu tienda?"),
    ).toBeNull();

    await userEvent.clear(slug);
    await userEvent.type(slug, "cafe-dos");
    await userEvent.click(
      screen.getByRole("button", { name: "Cambiar dirección" }),
    );
    expect(
      await screen.findByText("¿Cambiar la dirección de tu tienda?"),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(writes(calls)).toEqual([]);

    // The dialog is still closing, so wait for the page to be reachable.
    await userEvent.click(
      await screen.findByRole("button", { name: "Cambiar dirección" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Sí, cambiarla" }),
    );
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "POST",
        url: "/merchant/slug",
        data: { slug: "cafe-dos" },
      }),
    );
  });

  it("explains a taken address in Spanish", async () => {
    setup(OWNER, (call) =>
      call.method === "POST"
        ? apiError(409, "setup.slug_taken")
        : { status: 200, data: SETUP },
    );
    const slug = await screen.findByLabelText("Dirección");
    await userEvent.clear(slug);
    await userEvent.type(slug, "ocupada");
    await userEvent.click(
      screen.getByRole("button", { name: "Cambiar dirección" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Sí, cambiarla" }),
    );
    expect(
      await screen.findByText("Esa dirección no está disponible."),
    ).toBeInTheDocument();
  });
});

describe("Pagos", () => {
  it("keeps at least one payment method on", async () => {
    const { calls } = setup();
    await userEvent.click(await screen.findByRole("tab", { name: "Pagos" }));
    await userEvent.click(await screen.findByLabelText("Efectivo al recibir"));
    await userEvent.click(screen.getByLabelText("Tarjeta al recibir"));
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    expect(
      await screen.findByText("Deja al menos un método de pago activo."),
    ).toBeInTheDocument();
    expect(writes(calls)).toEqual([]);
  });

  it("saves the methods", async () => {
    const { calls } = setup();
    await userEvent.click(await screen.findByRole("tab", { name: "Pagos" }));
    await userEvent.click(await screen.findByLabelText("Tarjeta al recibir"));
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "PUT",
        url: "/merchant/payment-methods",
        data: { cashOnDelivery: true, cardOnDelivery: false },
      }),
    );
    expect(await screen.findByText("Cambios guardados.")).toBeInTheDocument();
  });
});

describe("Pedidos", () => {
  async function open(me: object = MANAGER) {
    const api = setup(me);
    await userEvent.click(await screen.findByRole("tab", { name: "Pedidos" }));
    await screen.findByLabelText("Título de la página");
    return api;
  }
  const save = () =>
    userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

  it("saves the order settings", async () => {
    const { calls } = await open();
    await userEvent.type(screen.getByLabelText("Título de la página"), "Café");
    await userEvent.type(screen.getByLabelText("Color principal"), "#1a73e8");
    await userEvent.click(screen.getByLabelText("Permitir propinas"));
    await userEvent.type(
      screen.getByLabelText("Porcentajes sugeridos"),
      "5, 10",
    );
    await save();
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        method: "PATCH",
        url: "/merchant/settings",
        data: {
          pageTitle: "Café",
          slogan: null,
          primaryColor: "#1a73e8",
          hideStoreName: false,
          asapEnabled: true,
          scheduledEnabled: false,
          slotIntervalMinutes: 30,
          maxScheduleDays: 7,
          tipsEnabled: true,
          tipPresetsPercent: [5, 10],
        },
      }),
    );
  });

  it("checks the form before sending anything", async () => {
    const { calls } = await open();
    await userEvent.type(screen.getByLabelText("Color principal"), "azul");
    const days = screen.getByLabelText("Días por adelantado");
    await userEvent.clear(days);
    await userEvent.type(days, "31");
    await userEvent.click(screen.getByLabelText("Pedidos inmediatos"));
    await userEvent.type(
      screen.getByLabelText("Porcentajes sugeridos"),
      "10, 5",
    );
    await save();
    expect(await screen.findByText("Usa un color como #1A73E8.")).toBeVisible();
    expect(screen.getByText("Ingresa un número de 1 a 30.")).toBeVisible();
    expect(
      screen.getByText("Activa pedidos inmediatos, programados o ambos."),
    ).toBeVisible();
    expect(screen.getByText(/Usa hasta 5 porcentajes distintos/)).toBeVisible();
    expect(writes(calls)).toEqual([]);
  });

  it("saves the contact links", async () => {
    const { calls } = await open();
    await userEvent.type(screen.getByLabelText("Teléfono"), "+504 2222-1111");
    await userEvent.type(screen.getByLabelText("WhatsApp"), "+50499998888");
    await userEvent.type(screen.getByLabelText("Correo"), "hola@cafe.hn");
    await userEvent.type(
      screen.getByLabelText("Instagram"),
      "https://instagram.com/cafe",
    );
    await save();
    await waitFor(() =>
      expect(writes(calls)[0]).toMatchObject({
        data: {
          contactPhone: "+50422221111",
          contactWhatsapp: "+50499998888",
          contactEmail: "hola@cafe.hn",
          instagramUrl: "https://instagram.com/cafe",
          facebookUrl: null,
          websiteUrl: null,
        },
      }),
    );
  });

  it("checks the contact links before sending", async () => {
    const { calls } = await open();
    await userEvent.type(screen.getByLabelText("Teléfono"), "22221111");
    await userEvent.type(screen.getByLabelText("Correo"), "no-es-correo");
    await userEvent.type(screen.getByLabelText("Sitio web"), "http://cafe.hn");
    await save();
    expect(await screen.findByText(/Usa el código de país/)).toBeVisible();
    expect(screen.getByText("Ingresa un correo válido.")).toBeVisible();
    expect(
      screen.getByText("Usa un enlace que empiece con https://"),
    ).toBeVisible();
    expect(writes(calls)).toEqual([]);
  });

  it("asks for percentages when tips are on", async () => {
    const { calls } = await open();
    await userEvent.click(screen.getByLabelText("Permitir propinas"));
    await save();
    expect(
      await screen.findByText(
        "Las propinas necesitan al menos un porcentaje sugerido.",
      ),
    ).toBeVisible();
    expect(writes(calls)).toEqual([]);
  });
});

describe("tip percentages", () => {
  it("accepts an ordered list of up to five", () => {
    expect(parseTipPresets("")).toEqual([]);
    expect(parseTipPresets(" 5 , 10,15 ")).toEqual([5, 10, 15]);
    expect(parseTipPresets("0, 12.5, 100")).toEqual([0, 12.5, 100]);
    expect(parseTipPresets("1,2,3,4,5")).toEqual([1, 2, 3, 4, 5]);
  });

  it("refuses everything else", () => {
    for (const text of [
      "10, 5",
      "5, 5",
      "101",
      "-1",
      "a",
      "1,2,3,4,5,6",
      "5.123",
    ])
      expect(parseTipPresets(text), text).toBeNull();
  });

  it("shows the server's decimals without trailing zeros", () => {
    expect(formatTipPresets(["5.00", "12.50"])).toBe("5, 12.5");
  });
});
