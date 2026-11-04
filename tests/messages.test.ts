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
      "auth.invalid_credentials",
      "auth.no_membership",
      "auth.invalid_refresh_token",
      "auth.csrf_header_required",
      "auth.invalid_token",
      "auth.token_expired",
      "auth.not_a_member",
      "auth.outlet_forbidden",
      "server.error",
      "server.database_unavailable",
      "server.auth_not_configured",
      "team.owner_only",
      "team.cannot_change_self",
      "team.last_owner",
      "team.already_member",
      "team.invitation_pending",
      "team.invitation_invalid",
      "team.invitation_not_found",
      "team.member_not_found",
      "team.role_not_found",
      "team.invalid_email",
      "team.dni_required",
      "team.password_too_short",
      "team.outlets_ambiguous",
      "team.outlet_not_found",
      "setup.no_order_timing",
      "setup.tips_need_presets",
      "setup.no_payment_method",
      "setup.slug_invalid",
      "setup.slug_reserved",
      "setup.slug_taken",
      "outlet.not_found",
      "outlet.name_taken",
      "outlet.archived",
      "outlet.not_ready",
      "outlet.invalid_pin",
      "outlet.invalid_times",
      "outlet.hours_overlap",
      "outlet.duplicate_exception",
      "outlet.exception_in_past",
      "outlet.duplicate_contact",
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
