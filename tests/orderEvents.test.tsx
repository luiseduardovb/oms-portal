import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { http } from "@/api/http";
import { setAccessToken } from "@/auth/tokenStore";
import { useOrderEvents, type StreamLike } from "@/orders/useOrderEvents";
import { apiError, fakeApi } from "./fakeApi";

class FakeStream implements StreamLike {
  listeners = new Map<string, (event: MessageEvent<string>) => void>();
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;
  constructor(public url: string) {}
  addEventListener(
    type: string,
    listener: (event: MessageEvent<string>) => void,
  ) {
    this.listeners.set(type, listener);
  }
  close() {
    this.closed = true;
  }
  open() {
    this.onopen?.(new Event("open"));
  }
  fail() {
    this.onerror?.(new Event("error"));
  }
  send(type: string, data: unknown) {
    this.listeners.get(type)?.({
      data: JSON.stringify(data),
    } as MessageEvent<string>);
  }
}

const event = (id: number, type = "order.placed") => ({
  id,
  type,
  outletId: 1,
  createdAt: "2026-11-06T10:00:00Z",
  payload: {},
});

function setup(options: { ticketFails?: boolean } = {}) {
  setAccessToken("token");
  const streams: FakeStream[] = [];
  const api = fakeApi(http, (call) => {
    if (call.url === "/events/ticket") {
      return options.ticketFails
        ? apiError(503, "events.unavailable")
        : {
            status: 201,
            data: { ticket: `t${streams.length}`, expiresInSeconds: 30 },
          };
    }
    if (call.url === "/events") {
      const after = call.params?.after as number | undefined;
      return after === undefined
        ? { status: 200, data: { events: [], cursor: 9, hasMore: false } }
        : {
            status: 200,
            data: {
              events: [event(after + 1)],
              cursor: after + 1,
              hasMore: false,
            },
          };
    }
    return { status: 404 };
  });
  const onEvent = vi.fn();
  const onRefresh = vi.fn();
  const view = renderHook(() =>
    useOrderEvents({
      enabled: true,
      onEvent,
      onRefresh,
      createStream: (url) => {
        const stream = new FakeStream(url);
        streams.push(stream);
        return stream;
      },
      retryDelays: [5],
      pollMs: 20,
      maxFailures: 2,
    }),
  );
  return { api, streams, onEvent, onRefresh, view };
}

function stream(list: FakeStream[], index: number): FakeStream {
  const found = list[index];
  if (!found) throw new Error(`no stream ${index}`);
  return found;
}

afterEach(() => setAccessToken(null));

describe("useOrderEvents", () => {
  it("opens the stream with a ticket and goes live", async () => {
    const { streams, view } = setup();
    await waitFor(() => expect(streams).toHaveLength(1));
    expect(stream(streams, 0).url).toBe("/api/events/stream?ticket=t0");
    act(() => stream(streams, 0).open());
    expect(view.result.current).toBe("live");
  });

  it("delivers events once, in order, and asks for a refresh", async () => {
    const { streams, onEvent, onRefresh } = setup();
    await waitFor(() => expect(streams).toHaveLength(1));
    act(() => {
      stream(streams, 0).open();
      stream(streams, 0).send("order.placed", event(3));
      stream(streams, 0).send("order.placed", event(3));
      stream(streams, 0).send(
        "order.status_changed",
        event(4, "order.status_changed"),
      );
    });
    expect(onEvent.mock.calls.map(([e]) => e.id)).toEqual([3, 4]);
    expect(onRefresh).toHaveBeenCalled();
  });

  it("reconnects with a new ticket and the last event id", async () => {
    const { streams, onRefresh } = setup();
    await waitFor(() => expect(streams).toHaveLength(1));
    act(() => {
      stream(streams, 0).open();
      stream(streams, 0).send("order.placed", event(7));
      stream(streams, 0).fail();
    });
    expect(stream(streams, 0).closed).toBe(true);
    await waitFor(() => expect(streams).toHaveLength(2));
    expect(stream(streams, 1).url).toBe("/api/events/stream?ticket=t1&after=7");
    onRefresh.mockClear();
    act(() => stream(streams, 1).open());
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("reloads the list on resync and continues from its id", async () => {
    const { streams, onRefresh, onEvent } = setup();
    await waitFor(() => expect(streams).toHaveLength(1));
    act(() => {
      stream(streams, 0).open();
      stream(streams, 0).send("resync", { id: 50 });
      stream(streams, 0).send("order.placed", event(40));
      stream(streams, 0).send("order.placed", event(51));
    });
    expect(onRefresh).toHaveBeenCalled();
    expect(onEvent.mock.calls.map(([e]) => e.id)).toEqual([51]);
  });

  it("falls back to polling after repeated failures", async () => {
    const { api, streams, onEvent, view } = setup({ ticketFails: true });
    await waitFor(() => expect(view.result.current).toBe("polling"));
    expect(streams).toHaveLength(0);
    await waitFor(() =>
      expect(
        api.calls.filter((c) => c.url === "/events").length,
      ).toBeGreaterThan(1),
    );
    await waitFor(() => expect(onEvent).toHaveBeenCalled());
  });

  it("stops when access was taken away", async () => {
    const { streams, view } = setup();
    await waitFor(() => expect(streams).toHaveLength(1));
    act(() => {
      stream(streams, 0).open();
      stream(streams, 0).send("closed", { reason: "access" });
    });
    expect(view.result.current).toBe("stopped");
    expect(stream(streams, 0).closed).toBe(true);
  });

  it("keeps polling when another window took the stream", async () => {
    const { api, streams, view } = setup();
    await waitFor(() => expect(streams).toHaveLength(1));
    act(() => {
      stream(streams, 0).open();
      stream(streams, 0).send("closed", { reason: "replaced" });
    });
    await waitFor(() => expect(view.result.current).toBe("polling"));
    await waitFor(() =>
      expect(
        api.calls.filter((c) => c.url === "/events").length,
      ).toBeGreaterThan(1),
    );
  });

  it("closes the stream when the screen goes away", async () => {
    const { streams, view } = setup();
    await waitFor(() => expect(streams).toHaveLength(1));
    view.unmount();
    expect(stream(streams, 0).closed).toBe(true);
  });
});
