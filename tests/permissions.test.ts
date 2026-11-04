import { describe, expect, it } from "vitest";
import { can, safeNext } from "@/auth/permissions";
import { visibleNav, type NavItem } from "@/components/shell/nav";

describe("can", () => {
  const levels = { orders: "full", catalog: "view" };

  it("treats full as including view", () => {
    expect(can(levels, "orders", "view")).toBe(true);
    expect(can(levels, "orders", "full")).toBe(true);
    expect(can(levels, "catalog", "view")).toBe(true);
    expect(can(levels, "catalog", "full")).toBe(false);
  });

  it("counts a missing area or missing levels as none", () => {
    expect(can(levels, "billing")).toBe(false);
    expect(can(undefined, "orders")).toBe(false);
  });
});

describe("visibleNav", () => {
  const items: NavItem[] = [
    { key: "home", href: "/" },
    { key: "team", href: "/team", area: "team" },
    { key: "billing", href: "/billing", area: "billing", level: "full" },
  ];

  it("hides items the role cannot use", () => {
    expect(visibleNav(items, { team: "view" }).map((i) => i.key)).toEqual([
      "home",
      "team",
    ]);
    expect(
      visibleNav(items, { team: "none", billing: "full" }).map((i) => i.key),
    ).toEqual(["home", "billing"]);
    expect(visibleNav(items, undefined).map((i) => i.key)).toEqual(["home"]);
  });
});

describe("safeNext", () => {
  it("only follows addresses on this site", () => {
    expect(safeNext("/team")).toBe("/team");
    expect(safeNext(null)).toBe("/");
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("//evil.example")).toBe("/");
  });
});
