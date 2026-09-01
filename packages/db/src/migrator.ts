import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import postgres from "postgres";

export type Migration = Readonly<{
  name: string;
  checksum: string;
  sql: string;
}>;

const migrationNamePattern = /^\d{4}_[a-z0-9][a-z0-9_-]*\.sql$/;

export async function discoverMigrations(directory: string): Promise<readonly Migration[]> {
  const names = (await readdir(directory))
    .filter((name) => migrationNamePattern.test(name))
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    names.map(async (name) => {
      const sql = await readFile(join(directory, name), "utf8");
      return {
        name,
        sql,
        checksum: createHash("sha256").update(sql).digest("hex"),
      };
    }),
  );
}

export async function applyMigrations(
  databaseUrl: string,
  migrationDirectory: string,
): Promise<readonly string[]> {
  const client = postgres(databaseUrl, { max: 1, onnotice: () => undefined });

  try {
    await client`
      create table if not exists ark_migrations (
        name text primary key,
        checksum text not null,
        applied_at timestamptz not null default now()
      )
    `;

    const applied = await client<{ name: string; checksum: string }[]>`
      select name, checksum from ark_migrations order by name
    `;
    const appliedByName = new Map(applied.map((migration) => [migration.name, migration.checksum]));
    const pending = await discoverMigrations(migrationDirectory);
    const newlyApplied: string[] = [];

    for (const migration of pending) {
      const existingChecksum = appliedByName.get(migration.name);
      if (existingChecksum && existingChecksum !== migration.checksum) {
        throw new Error(`Applied migration changed: ${migration.name}`);
      }
      if (existingChecksum) {
        continue;
      }

      await client.begin(async (transaction) => {
        await transaction.unsafe(migration.sql);
        await transaction`
          insert into ark_migrations (name, checksum)
          values (${migration.name}, ${migration.checksum})
        `;
      });
      newlyApplied.push(migration.name);
    }

    return newlyApplied;
  } finally {
    await client.end({ timeout: 5 });
  }
}
