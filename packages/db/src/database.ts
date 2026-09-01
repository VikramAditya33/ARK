// SPDX-License-Identifier: MIT

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import * as schema from "./schema/index.js";

export type ArkDatabase = PostgresJsDatabase<typeof schema>;

export type DatabaseHandle = Readonly<{
  db: ArkDatabase;
  client: Sql;
  close: () => Promise<void>;
}>;

export function createDatabase(
  databaseUrl: string,
  options: Readonly<{ max?: number }> = {},
): DatabaseHandle {
  const client = postgres(databaseUrl, {
    max: options.max ?? 10,
    onnotice: () => undefined,
  });
  const db = drizzle(client, { schema });

  return Object.freeze({
    db,
    client,
    close: async () => client.end({ timeout: 5 }),
  });
}
