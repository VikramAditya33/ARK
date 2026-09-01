import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { applyMigrations } from "./migrator.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Missing configuration: DATABASE_URL");
}

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationDirectory = resolve(packageDirectory, "../../infra/migrations");
const applied = await applyMigrations(databaseUrl, migrationDirectory);

console.log(applied.length === 0 ? "Database is up to date." : `Applied: ${applied.join(", ")}`);
