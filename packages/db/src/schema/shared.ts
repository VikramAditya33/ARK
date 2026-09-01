// SPDX-License-Identifier: MIT

import { sql } from "drizzle-orm";
import { jsonb, timestamp } from "drizzle-orm/pg-core";

export type JsonObject = Readonly<Record<string, unknown>>;

export const emptyJsonObject = sql`'{}'::jsonb`;
export const emptyJsonArray = sql`'[]'::jsonb`;

export const createdAt = () =>
  timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull();
export const updatedAt = () =>
  timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull();
export const jsonObject = (name: string) =>
  jsonb(name).$type<JsonObject>().default(emptyJsonObject).notNull();
