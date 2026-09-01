// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import { CaptureRunId, SourceSystemId } from "./identifiers.js";
import { CAPTURE_METHODS, assertProvenancePointer, isCaptureMethod } from "./provenance.js";

describe("provenance pointers", () => {
  const pointer = {
    sourceSystemId: SourceSystemId.generate(),
    captureRunId: CaptureRunId.generate(),
    stream: "customers",
    nativeId: "cust_3918",
    jsonPointer: "/renewalDate",
    captureMethod: "network" as const,
    capturedAt: "2026-09-01T08:30:00.000Z",
  };

  it("defines every authorized capture boundary", () => {
    expect(CAPTURE_METHODS).toEqual(["api", "export", "network", "browser", "desktop", "manual"]);
    expect(CAPTURE_METHODS.every(isCaptureMethod)).toBe(true);
  });

  it("accepts traceable field-level provenance", () => {
    expect(() => assertProvenancePointer(pointer)).not.toThrow();
  });

  it("rejects incomplete or malformed provenance", () => {
    expect(() => assertProvenancePointer({ ...pointer, stream: "" })).toThrow(TypeError);
    expect(() => assertProvenancePointer({ ...pointer, capturedAt: "tomorrow" })).toThrow(
      TypeError,
    );
    expect(() => assertProvenancePointer({ ...pointer, jsonPointer: "renewalDate" })).toThrow(
      TypeError,
    );
  });
});
