// SPDX-License-Identifier: MIT

import type { OrganizationId, SolariResourceId } from "@ark/domain";
import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { solariResourceStateEnum } from "./enums.js";
import { organizations } from "./identity.js";
import { createdAt, type JsonObject, updatedAt } from "./shared.js";

export const solariResources = pgTable(
  "solari_resources",
  {
    id: uuid("id").$type<SolariResourceId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    environment: text("environment").notNull(),
    ownerJobType: text("owner_job_type").notNull(),
    ownerJobId: uuid("owner_job_id").notNull(),
    product: text("product").notNull(),
    remoteSessionId: text("remote_session_id"),
    state: solariResourceStateEnum("state").default("requested").notNull(),
    cleanupMode: text("cleanup_mode").notNull(),
    timeoutSeconds: integer("timeout_seconds").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    safeError: jsonb("safe_error").$type<JsonObject>(),
    connectedAt: timestamp("connected_at", { mode: "string", withTimezone: true }),
    releasedAt: timestamp("released_at", { mode: "string", withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("solari_resources_org_idempotency_unique").on(
      table.organizationId,
      table.idempotencyKey,
    ),
    uniqueIndex("solari_resources_remote_unique").on(
      table.environment,
      table.product,
      table.remoteSessionId,
    ),
    unique("solari_resources_org_id_unique").on(table.organizationId, table.id),
  ],
);
