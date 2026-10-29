import { describe, expect, it } from "vitest";
import messages from "../messages/es.json";

function leaves(value: unknown, path = ""): string[] {
  if (typeof value === "string") return [path];
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, nested]) =>
    leaves(nested, path ? `${path}.${key}` : key),
  );
}

describe("Spanish catalog", () => {
  it("has a translation for every error code the API can send", () => {
    // Codes defined in oms-be app/contrib/errors.py (STATUS_CODES) plus the
    // ones the portal raises itself. Add new API codes here and in es.json.
    const codes = [
      "common.bad_request",
      "common.not_found",
      "common.method_not_allowed",
      "common.conflict",
      "common.validation_error",
      "common.invalid_sort",
      "common.rate_limited",
      "auth.unauthenticated",
      "auth.forbidden",
      "server.error",
      "client.network_error",
      "client.unknown_error",
    ];
    const present = leaves(messages.errors).map((k) => k);
    for (const code of codes) expect(present).toContain(code);
  });

  it("has no empty strings", () => {
    const empty = leaves(messages).filter((path) => {
      const value = path
        .split(".")
        .reduce<unknown>(
          (acc, key) => (acc as Record<string, unknown>)[key],
          messages,
        );
      return value === "";
    });
    expect(empty).toEqual([]);
  });
});
