// SPDX-License-Identifier: MIT

import type {
  DrillRunId,
  DrillScenarioId,
  DrillStepId,
  OrganizationId,
  RecoveryBuildId,
  RecoveryBuildInputId,
} from "@ark/domain";
import {
  foreignKey,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { buildStateEnum, drillStateEnum } from "./enums.js";
import { organizations } from "./identity.js";
import { createdAt, emptyJsonObject, type JsonObject, updatedAt } from "./shared.js";

export const recoveryBuilds = pgTable(
  "recovery_builds",
  {
    id: uuid("id").$type<RecoveryBuildId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    state: buildStateEnum("state").default("queued").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    checksum: text("checksum"),
    runtimeReference: text("runtime_reference"),
    readyAt: timestamp("ready_at", { mode: "string", withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("recovery_builds_org_idempotency_unique").on(
      table.organizationId,
      table.idempotencyKey,
    ),
    unique("recovery_builds_org_id_unique").on(table.organizationId, table.id),
  ],
);

export const recoveryBuildInputs = pgTable(
  "recovery_build_inputs",
  {
    id: uuid("id").$type<RecoveryBuildInputId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    recoveryBuildId: uuid("recovery_build_id").$type<RecoveryBuildId>().notNull(),
    inputType: text("input_type").notNull(),
    inputId: uuid("input_id").notNull(),
    checksum: text("checksum").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("recovery_build_inputs_input_unique").on(
      table.organizationId,
      table.recoveryBuildId,
      table.inputType,
      table.inputId,
    ),
    unique("recovery_build_inputs_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.recoveryBuildId],
      foreignColumns: [recoveryBuilds.organizationId, recoveryBuilds.id],
      name: "recovery_build_inputs_build_same_org_fk",
    }).onDelete("cascade"),
  ],
);

export const drillScenarios = pgTable(
  "drill_scenarios",
  {
    id: uuid("id").$type<DrillScenarioId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    version: integer("version").notNull(),
    definition: jsonb("definition").$type<JsonObject>().notNull(),
    publishedAt: timestamp("published_at", { mode: "string", withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("drill_scenarios_org_key_version_unique").on(
      table.organizationId,
      table.key,
      table.version,
    ),
    unique("drill_scenarios_org_id_unique").on(table.organizationId, table.id),
  ],
);

export const drillRuns = pgTable(
  "drill_runs",
  {
    id: uuid("id").$type<DrillRunId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    drillScenarioId: uuid("drill_scenario_id").$type<DrillScenarioId>().notNull(),
    recoveryBuildId: uuid("recovery_build_id").$type<RecoveryBuildId>().notNull(),
    state: drillStateEnum("state").default("queued").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    verdict: text("verdict"),
    startedAt: timestamp("started_at", { mode: "string", withTimezone: true }),
    completedAt: timestamp("completed_at", { mode: "string", withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("drill_runs_org_idempotency_unique").on(table.organizationId, table.idempotencyKey),
    unique("drill_runs_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.drillScenarioId],
      foreignColumns: [drillScenarios.organizationId, drillScenarios.id],
      name: "drill_runs_scenario_same_org_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.recoveryBuildId],
      foreignColumns: [recoveryBuilds.organizationId, recoveryBuilds.id],
      name: "drill_runs_build_same_org_fk",
    }).onDelete("restrict"),
  ],
);

export const drillSteps = pgTable(
  "drill_steps",
  {
    id: uuid("id").$type<DrillStepId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    drillRunId: uuid("drill_run_id").$type<DrillRunId>().notNull(),
    sequence: integer("sequence").notNull(),
    kind: text("kind").notNull(),
    status: text("status").notNull(),
    input: jsonb("input").$type<JsonObject>().default(emptyJsonObject).notNull(),
    output: jsonb("output").$type<JsonObject>(),
    startedAt: timestamp("started_at", { mode: "string", withTimezone: true }),
    completedAt: timestamp("completed_at", { mode: "string", withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("drill_steps_run_sequence_unique").on(
      table.organizationId,
      table.drillRunId,
      table.sequence,
    ),
    unique("drill_steps_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.drillRunId],
      foreignColumns: [drillRuns.organizationId, drillRuns.id],
      name: "drill_steps_run_same_org_fk",
    }).onDelete("cascade"),
  ],
);
