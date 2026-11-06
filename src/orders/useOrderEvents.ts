"use client";

import { useEffect, useRef, useState } from "react";
import { http } from "@/api/http";
import type { OrderEvent, Ticket } from "@/orders/ordersApi";

export const EVENT_TYPES = [
  "order.placed",
  "order.status_changed",
  "order.unaccepted",
] as const;

export type LiveState = "connecting" | "live" | "polling" | "stopped";

/** The parts of EventSource the hook uses, so tests can replace it. */
export interface StreamLike {
  addEventListener(
    type: string,
    listener: (event: MessageEvent<string>) => void,
  ): void;
  onopen: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  close(): void;
}
export type StreamFactory = (url: string) => StreamLike;

export interface OrderEventsOptions {
  enabled: boolean;
  /** Called with each new event, in order. */
  onEvent: (event: OrderEvent) => void;
  /** Called when the list may be stale (reconnected, resync, polled). */
  onRefresh: () => void;
  createStream?: StreamFactory;
  /** Delays in ms, overridable in tests. */
  retryDelays?: number[];
  pollMs?: number;
  /** Failed stream attempts in a row before falling back to polling. */
  maxFailures?: number;
}

const DEFAULT_RETRY = [1000, 2000, 5000, 10000];

/** Keeps the orders screen live. Opens the event stream with a one-use
 * ticket; when it drops, asks for a new ticket and resumes after the last
 * event seen. After repeated failures it polls `GET /events` instead and
 * keeps trying the stream in the background. */
export function useOrderEvents(options: OrderEventsOptions): LiveState {
  const [state, setState] = useState<LiveState>("connecting");
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    if (!options.enabled) return;
    let disposed = false;
    let stream: StreamLike | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let lastId: number | null = null;
    let failures = 0;

    const opts = () => latest.current;
    const delays = () => opts().retryDelays ?? DEFAULT_RETRY;

    const deliver = (event: OrderEvent) => {
      if (lastId !== null && event.id <= lastId) return;
      lastId = event.id;
      opts().onEvent(event);
    };

    const stopPolling = () => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = undefined;
    };

    const poll = async () => {
      try {
        if (lastId === null) {
          const first = await http.get<{ cursor: number }>("/events");
          lastId = first.data.cursor;
          return;
        }
        const { data } = await http.get<{
          events: OrderEvent[];
          cursor: number;
        }>("/events", { params: { after: lastId, limit: 100 } });
        data.events.forEach(deliver);
        if (data.events.length) opts().onRefresh();
      } catch {
        // Try again on the next tick.
      }
    };

    const startPolling = () => {
      if (pollTimer || disposed) return;
      setState("polling");
      // Events may have been missed while the stream was down.
      opts().onRefresh();
      void poll();
      pollTimer = setInterval(() => void poll(), opts().pollMs ?? 10000);
    };

    const schedule = () => {
      if (disposed) return;
      failures += 1;
      const list = delays();
      const wait = list[Math.min(failures - 1, list.length - 1)] ?? 1000;
      if (failures >= (opts().maxFailures ?? 4)) startPolling();
      timer = setTimeout(() => void connect(), wait);
    };

    const connect = async () => {
      if (disposed) return;
      stream?.close();
      stream = null;
      let ticket: string;
      try {
        const { data } = await http.post<Ticket>("/events/ticket");
        ticket = data.ticket;
      } catch {
        schedule();
        return;
      }
      if (disposed) return;
      const query = new URLSearchParams({ ticket });
      if (lastId !== null) query.set("after", String(lastId));
      const make =
        opts().createStream ??
        ((url: string) => new EventSource(url) as unknown as StreamLike);
      let current: StreamLike;
      try {
        current = make(`/api/events/stream?${query.toString()}`);
      } catch {
        // No EventSource in this browser: go straight to polling.
        failures = opts().maxFailures ?? 4;
        schedule();
        return;
      }
      stream = current;

      current.onopen = () => {
        if (disposed || stream !== current) return;
        const recovered = failures > 0;
        failures = 0;
        stopPolling();
        setState("live");
        // Anything that happened while we were away is replayed by the
        // server from `after`; the list is refreshed once to be safe.
        if (recovered) opts().onRefresh();
      };
      for (const type of EVENT_TYPES) {
        current.addEventListener(type, (message) => {
          try {
            deliver(JSON.parse(message.data) as OrderEvent);
          } catch {
            return;
          }
          opts().onRefresh();
        });
      }
      current.addEventListener("resync", (message) => {
        try {
          const { id } = JSON.parse(message.data) as { id: number };
          lastId = id;
        } catch {
          // Keep the old cursor; the refresh below reloads the list.
        }
        opts().onRefresh();
      });
      current.addEventListener("closed", (message) => {
        current.close();
        stream = null;
        let reason = "";
        try {
          reason =
            (JSON.parse(message.data) as { reason?: string }).reason ?? "";
        } catch {
          // Unknown reason: treat like a lost stream.
        }
        if (reason === "access") {
          // Access changed: stop for good; the user must reload.
          stopPolling();
          setState("stopped");
          disposed = true;
          return;
        }
        // Another window holds the live stream: keep this one current by
        // polling instead of going quiet.
        startPolling();
      });
      // A single-use ticket makes EventSource's own reconnect useless, so
      // close it and start over with a fresh ticket.
      current.onerror = () => {
        if (disposed || stream !== current) return;
        current.close();
        stream = null;
        schedule();
      };
    };

    void connect();
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      stopPolling();
      stream?.close();
    };
  }, [options.enabled]);

  return options.enabled ? state : "stopped";
}
