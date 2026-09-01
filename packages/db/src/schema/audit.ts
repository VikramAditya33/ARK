// SPDX-License-Identifier: MIT

import type { AuditEventId, OrganizationId, StateTransitionId } from "@ark/domain";
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

import { dataClassificationEnum } from "./enums.js";
import { organizations } from "./identity.js";
import { createdAt, emptyJsonArray, type JsonObject } from "./shared.js";

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").$type<AuditEventId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    actor: jsonb("actor").$type<JsonObject>().notNull(),
    source: text("source").notNull(),
    change: jsonb("change").$type<JsonObject>().notNull(),
    occurredAt: timestamp("occurred_at", { mode: "string", withTimezone: true }).notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    causationId: uuid("causation_id").$type<AuditEventId>(),
    correlationId: text("correlation_id").notNull(),
    classification: dataClassificationEnum("classification").notNull(),
    provenance: jsonb("provenance")
      .$type<readonly JsonObject[]>()
      .default(emptyJsonArray)
      .notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("audit_events_scope_idempotency_unique").on(
      table.organizationId,
      table.aggregateType,
      table.aggregateId,
      table.idempotencyKey,
    ),
    unique("audit_events_org_id_unique").on(table.organizationId, table.id),
  ],
);

export const stateTransitions = pgTable(
  "state_transitions",
  {
    id: uuid("id").$type<StateTransitionId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    machine: text("machine").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    fromState: text("from_state").notNull(),
    toState: text("to_state").notNull(),
    revision: integer("revision").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    correlationId: text("correlation_id").notNull(),
    occurredAt: timestamp("occurred_at", { mode: "string", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("state_transitions_scope_idempotency_unique").on(
      table.organizationId,
      table.machine,
      table.aggregateId,
      table.idempotencyKey,
    ),
    uniqueIndex("state_transitions_scope_revision_unique").on(
      table.organizationId,
      table.machine,
      table.aggregateId,
      table.revision,
    ),
    unique("state_transitions_org_id_unique").on(table.organizationId, table.id),
  ],
);
