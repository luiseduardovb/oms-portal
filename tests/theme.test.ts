import { describe, expect, it } from "vitest";
import { theme } from "@/theme/theme";

describe("theme", () => {
  it("is defined in one place with a primary colour", () => {
    expect(theme.palette.primary.main).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
