// SPDX-License-Identifier: MIT

import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import postgres from "postgres";
import { describe, expect, it } from "vitest";

import { applyMigrations } from "./migrator.js";
import { withTemporaryDatabase } from "./testing/postgres.js";

const databaseUrl = process.env.DATABASE_URL;
const migrationDirectory = new URL("../../../infra/migrations/", import.meta.url).pathname;

describe.skipIf(!databaseUrl)("PostgreSQL migrations", () => {
  it("applies the complete schema from empty and remains idempotent", async () => {
    await withTemporaryDatabase(databaseUrl!, async (temporaryDatabaseUrl) => {
      const first = await applyMigrations(temporaryDatabaseUrl, migrationDirectory);
      const second = await applyMigrations(temporaryDatabaseUrl, migrationDirectory);
      const client = postgres(temporaryDatabaseUrl, { max: 1, onnotice: () => undefined });

      try {
        const migrations = await client<{ name: string }[]>`
          select name from ark_migrations order by name
        `;
        const tableCount = await client<{ count: number }[]>`
          select count(*)::int as count
          from information_schema.tables
          where table_schema = 'public' and table_type = 'BASE TABLE'
        `;

        expect(first).toEqual([
          "0000_extensions.sql",
          "0001_domain_foundation.sql",
          "0002_provenance_raw_links.sql",
        ]);
        expect(second).toEqual([]);
        expect(migrations.map(({ name }) => name)).toEqual(first);
        expect(tableCount[0]?.count).toBe(39);
      } finally {
        await client.end({ timeout: 5 });
      }
    });
  });

  it("upgrades a database containing only the previous migration", async () => {
    await withTemporaryDatabase(databaseUrl!, async (temporaryDatabaseUrl) => {
      const baselineDirectory = await mkdtemp(join(tmpdir(), "ark-baseline-migrations-"));
      try {
        await copyFile(
          join(migrationDirectory, "0000_extensions.sql"),
          join(baselineDirectory, "0000_extensions.sql"),
        );
        await expect(applyMigrations(temporaryDatabaseUrl, baselineDirectory)).resolves.toEqual([
          "0000_extensions.sql",
        ]);
        await expect(applyMigrations(temporaryDatabaseUrl, migrationDirectory)).resolves.toEqual([
          "0001_domain_foundation.sql",
          "0002_provenance_raw_links.sql",
        ]);
      } finally {
        await rm(baselineDirectory, { force: true, recursive: true });
      }
    });
  });
});
