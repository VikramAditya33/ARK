import postgres from "postgres";
import { describe, expect, it } from "vitest";

import { applyMigrations } from "./migrator.js";

const databaseUrl = process.env.DATABASE_URL;
const migrationDirectory = new URL("../../../infra/migrations/", import.meta.url).pathname;

describe.skipIf(!databaseUrl)("PostgreSQL migration integration", () => {
  it("applies migrations idempotently against local infrastructure", async () => {
    const first = await applyMigrations(databaseUrl!, migrationDirectory);
    const second = await applyMigrations(databaseUrl!, migrationDirectory);
    const client = postgres(databaseUrl!, { max: 1, onnotice: () => undefined });

    try {
      const rows = await client<{ name: string }[]>`select name from ark_migrations order by name`;
      expect(first.every((name) => name === "0000_extensions.sql")).toBe(true);
      expect(second).toEqual([]);
      expect(rows.map(({ name }) => name)).toContain("0000_extensions.sql");
    } finally {
      await client.end({ timeout: 5 });
    }
  });
});
