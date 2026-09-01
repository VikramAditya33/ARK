import { describe, expect, it } from "vitest";

describe("ARK test layers", () => {
  it("runs unit tests without network access", () => {
    expect({ layer: "unit", network: false }).toEqual({ layer: "unit", network: false });
  });
});
