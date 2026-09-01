// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  ArtifactId,
  CaptureRunId,
  OrganizationId,
  SolariResourceId,
  UserId,
} from "./identifiers.js";

describe("opaque ARK identifiers", () => {
  it("generates unique server-side UUIDs without tenant material", () => {
    const first = OrganizationId.generate();
    const second = OrganizationId.generate();

    expect(first).not.toBe(second);
    expect(OrganizationId.is(first)).toBe(true);
    expect(first).not.toContain("organization");
  });

  it("parses database-generated UUIDs into a typed identifier", () => {
    const value = "0198fc4f-d168-72af-9ebb-71b87600d777";
    expect(UserId.parse(value)).toBe(value);
  });

  it("rejects identifiers that encode readable or malformed material", () => {
    expect(() => CaptureRunId.parse("capture_acme_123")).toThrow(TypeError);
    expect(ArtifactId.is("")).toBe(false);
    expect(SolariResourceId.is(null)).toBe(false);
  });
});
