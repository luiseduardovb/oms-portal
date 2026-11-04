import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http } from "@/api/http";
import { refreshHttp, refreshSession } from "@/auth/refresh";
import {
  getAccessToken,
  onSessionLost,
  setAccessToken,
} from "@/auth/tokenStore";
import { apiError, fakeApi, TOKENS } from "./fakeApi";

afterEach(() => setAccessToken(null));

describe("access token handling", () => {
  beforeEach(() => setAccessToken("old-token"));

  it("sends the access token with API calls", async () => {
    const { calls } = fakeApi(http, () => ({ status: 200, data: {} }));
    await http.get("/me");
    expect(calls[0]?.authorization).toBe("Bearer old-token");
  });

  it("renews an expired token once and repeats the request", async () => {
    fakeApi(refreshHttp, () => ({ status: 200, data: TOKENS }));
    const { calls } = fakeApi(http, (call) =>
      call.authorization === "Bearer new-token"
        ? { status: 200, data: { ok: true } }
        : apiError(401, "auth.token_expired"),
    );
    const response = await http.get("/me");
    expect(response.data).toEqual({ ok: true });
    expect(calls.map((c) => c.authorization)).toEqual([
      "Bearer old-token",
      "Bearer new-token",
    ]);
    expect(getAccessToken()).toBe("new-token");
  });

  it("shares one refresh between calls that expire together", async () => {
    const refresh = fakeApi(refreshHttp, () => ({ status: 200, data: TOKENS }));
    fakeApi(http, (call) =>
      call.authorization === "Bearer new-token"
        ? { status: 200, data: {} }
        : apiError(401, "auth.token_expired"),
    );
    await Promise.all([http.get("/a"), http.get("/b"), http.get("/c")]);
    expect(refresh.calls).toHaveLength(1);
    expect(refresh.calls[0]?.csrf).toBe("oms-portal");
  });

  it("ends the session when the refresh is refused", async () => {
    fakeApi(refreshHttp, () => apiError(401, "auth.invalid_refresh_token"));
    fakeApi(http, () => apiError(401, "auth.token_expired"));
    const lost = vi.fn();
    const stop = onSessionLost(lost);
    await expect(http.get("/me")).rejects.toMatchObject({
      response: { status: 401 },
    });
    stop();
    expect(lost).toHaveBeenCalledOnce();
    expect(getAccessToken()).toBeNull();
  });

  it("keeps the session on a network failure during refresh", async () => {
    fakeApi(refreshHttp, () => ({ status: 503, data: {} }));
    const lost = vi.fn();
    const stop = onSessionLost(lost);
    expect(await refreshSession()).toBeNull();
    stop();
    expect(lost).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe("old-token");
  });

  it("never repeats auth calls or other 401 codes", async () => {
    const refresh = fakeApi(refreshHttp, () => ({ status: 200, data: TOKENS }));
    const { calls } = fakeApi(http, () =>
      apiError(401, "auth.invalid_credentials"),
    );
    await expect(http.post("/auth/login", {})).rejects.toBeDefined();
    await expect(http.get("/me")).rejects.toBeDefined();
    expect(calls).toHaveLength(2);
    expect(refresh.calls).toHaveLength(0);
  });

  it("does not retry other errors", async () => {
    const { calls } = fakeApi(http, () => apiError(403, "auth.forbidden"));
    await expect(http.get("/team/members")).rejects.toBeDefined();
    expect(calls).toHaveLength(1);
  });
});
