import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { discoverMigrations } from "./migrator.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map(async (directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe("migration discovery", () => {
  it("returns valid SQL migrations in lexical order with stable checksums", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ark-migrations-"));
    temporaryDirectories.push(directory);
    await writeFile(join(directory, "0002_second.sql"), "select 2;\n");
    await writeFile(join(directory, "0001_first.sql"), "select 1;\n");
    await writeFile(join(directory, "README.txt"), "ignored\n");

    const migrations = await discoverMigrations(directory);

    expect(migrations.map(({ name }) => name)).toEqual(["0001_first.sql", "0002_second.sql"]);
    expect(migrations[0]?.checksum).toHaveLength(64);
  });
});
