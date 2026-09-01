import { describe, expect, it, vi } from "vitest";

import { runCli } from "./cli.js";

describe("ARK CLI foundation", () => {
  it("reports foundation health", () => {
    const stdout = vi.fn();
    const stderr = vi.fn();

    expect(runCli(["doctor"], { stdout, stderr })).toBe(0);
    expect(stdout).toHaveBeenCalledWith(
      JSON.stringify({ service: "ark-cli", status: "ready", phase: 1 }),
    );
    expect(stderr).not.toHaveBeenCalled();
  });

  it("fails unknown commands", () => {
    const stdout = vi.fn();
    const stderr = vi.fn();

    expect(runCli(["unknown"], { stdout, stderr })).toBe(1);
    expect(stderr).toHaveBeenCalledWith("Unknown command: unknown");
  });
});
