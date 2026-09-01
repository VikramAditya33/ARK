import { describe, expect, it } from "vitest";

import { workerFoundationStatus } from "./foundation.js";

describe("ARK worker foundation", () => {
  it("exposes a deterministic readiness status", () => {
    expect(workerFoundationStatus()).toEqual({
      service: "ark-worker",
      status: "ready",
      phase: 1,
    });
  });
});
