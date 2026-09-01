import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["src/**/*.integration.test.ts", "src/**/*.live.test.ts"],
    include: ["src/**/*.test.ts"],
  },
});
