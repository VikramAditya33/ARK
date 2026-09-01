import { resolve } from "node:path";

import { SolariClient } from "@solarisdk/sdk";
import { config as loadEnvironment } from "dotenv";
import { describe, expect, it } from "vitest";

loadEnvironment({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });

const apiKey = process.env.SOLARI_API_KEY;

describe("Solari live-test harness", () => {
  it.skipIf(!apiKey)("creates, uses, and destroys one budget-bounded sandbox", async () => {
    const client = new SolariClient({ apiKey: apiKey! });
    const sandbox = await client.sandboxes.create({
      template: "base",
      timeoutMs: 60_000,
    });

    try {
      const result = await sandbox.commands.run("printf", { args: ["ark-live-ok"] });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("ark-live-ok");
    } finally {
      await sandbox.kill();
    }
  });
});
