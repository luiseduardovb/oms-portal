import {
  AxiosError,
  type AxiosAdapter,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

export interface FakeCall {
  method: string;
  url: string;
  authorization: string | undefined;
  csrf: string | undefined;
  data: unknown;
  params: Record<string, unknown> | undefined;
}

type Handler = (call: FakeCall) => { status: number; data?: unknown };

/** Replace an axios instance's network layer with a scripted one, so tests
 * exercise the real interceptors without a server. */
export function fakeApi(
  instance: AxiosInstance,
  handler: Handler,
): { calls: FakeCall[] } {
  const calls: FakeCall[] = [];
  const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    const call: FakeCall = {
      method: (config.method ?? "get").toUpperCase(),
      url: config.url ?? "",
      authorization: config.headers.get("Authorization") as string | undefined,
      csrf: config.headers.get("X-Requested-With") as string | undefined,
      params: config.params as Record<string, unknown> | undefined,
      data:
        typeof config.data === "string" ? JSON.parse(config.data) : config.data,
    };
    calls.push(call);
    const { status, data } = handler(call);
    const response = {
      status,
      statusText: String(status),
      data,
      headers: {},
      config,
      request: {},
    };
    if (status >= 400) {
      throw new AxiosError(
        `status ${status}`,
        AxiosError.ERR_BAD_REQUEST,
        config,
        {},
        response,
      );
    }
    return response;
  };
  instance.defaults.adapter = adapter;
  return { calls };
}

export function apiError(status: number, code: string) {
  return { status, data: { detail: { code, message: code, ctx: {} } } };
}

export const ME = {
  user: {
    id: 1,
    email: "ana@example.com",
    phone: null,
    firstName: "Ana",
    lastName: "López",
  },
  merchant: { id: 10, name: "Café Uno", slug: "cafe-uno", status: "draft" },
  memberId: 5,
  role: { id: 2, name: "Manager", templateKey: "manager" },
  isOwner: false,
  levels: { orders: "full", team: "full" },
  extras: [],
  outlets: { all: true, ids: [] },
  dni: null,
  memberships: [
    {
      memberId: 5,
      merchantId: 10,
      merchantName: "Café Uno",
      merchantSlug: "cafe-uno",
      merchantStatus: "draft",
    },
    {
      memberId: 6,
      merchantId: 11,
      merchantName: "Grill Dos",
      merchantSlug: "grill-dos",
      merchantStatus: "draft",
    },
  ],
};

export const TOKENS = {
  accessToken: "new-token",
  tokenType: "bearer",
  expiresIn: 900,
  merchantId: 10,
  memberships: ME.memberships,
};
