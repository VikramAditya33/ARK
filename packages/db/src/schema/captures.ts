// SPDX-License-Identifier: MIT

import type {
  CaptureCursorId,
  CaptureRunId,
  CaptureStreamRunId,
  ConnectorInstanceId,
  OrganizationId,
  RawRecordEnvelopeId,
  SourceSchemaVersionId,
  SourceSystemId,
} from "@ark/domain";
import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { captureMethodEnum, captureStateEnum, dataClassificationEnum } from "./enums.js";
import { organizations } from "./identity.js";
import { createdAt, type JsonObject, updatedAt } from "./shared.js";
import { connectorInstances, sourceSystems } from "./sources.js";

export const captureRuns = pgTable(
  "capture_runs",
  {
    id: uuid("id").$type<CaptureRunId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    connectorInstanceId: uuid("connector_instance_id").$type<ConnectorInstanceId>().notNull(),
    state: captureStateEnum("state").default("queued").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestedAt: timestamp("requested_at", { mode: "string", withTimezone: true })
      .defaultNow()
      .notNull(),
    startedAt: timestamp("started_at", { mode: "string", withTimezone: true }),
    completedAt: timestamp("completed_at", { mode: "string", withTimezone: true }),
    safeError: jsonb("safe_error").$type<JsonObject>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("capture_runs_org_idempotency_unique").on(
      table.organizationId,
      table.idempotencyKey,
    ),
    unique("capture_runs_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.connectorInstanceId],
      foreignColumns: [connectorInstances.organizationId, connectorInstances.id],
      name: "capture_runs_connector_same_org_fk",
    }).onDelete("restrict"),
  ],
);

export const captureStreamRuns = pgTable(
  "capture_stream_runs",
  {
    id: uuid("id").$type<CaptureStreamRunId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    captureRunId: uuid("capture_run_id").$type<CaptureRunId>().notNull(),
    stream: text("stream").notNull(),
    state: captureStateEnum("state").default("queued").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    recordsRead: integer("records_read").default(0).notNull(),
    artifactsRead: integer("artifacts_read").default(0).notNull(),
    checkpointedAt: timestamp("checkpointed_at", { mode: "string", withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("capture_stream_runs_run_stream_unique").on(
      table.organizationId,
      table.captureRunId,
      table.stream,
    ),
    uniqueIndex("capture_stream_runs_scope_idempotency_unique").on(
      table.organizationId,
      table.captureRunId,
      table.idempotencyKey,
    ),
    unique("capture_stream_runs_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.captureRunId],
      foreignColumns: [captureRuns.organizationId, captureRuns.id],
      name: "capture_stream_runs_run_same_org_fk",
    }).onDelete("cascade"),
  ],
);

export const captureCursors = pgTable(
  "capture_cursors",
  {
    id: uuid("id").$type<CaptureCursorId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    connectorInstanceId: uuid("connector_instance_id").$type<ConnectorInstanceId>().notNull(),
    stream: text("stream").notNull(),
    partition: text("partition").default("").notNull(),
    cursor: jsonb("cursor").$type<JsonObject>().notNull(),
    sourceClock: timestamp("source_clock", { mode: "string", withTimezone: true }),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("capture_cursors_stream_partition_unique").on(
      table.organizationId,
      table.connectorInstanceId,
      table.stream,
      table.partition,
    ),
    unique("capture_cursors_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.connectorInstanceId],
      foreignColumns: [connectorInstances.organizationId, connectorInstances.id],
      name: "capture_cursors_connector_same_org_fk",
    }).onDelete("cascade"),
  ],
);

export const sourceSchemaVersions = pgTable(
  "source_schema_versions",
  {
    id: uuid("id").$type<SourceSchemaVersionId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    sourceSystemId: uuid("source_system_id").$type<SourceSystemId>().notNull(),
    stream: text("stream").notNull(),
    sourceVersion: text("source_version"),
    fingerprint: text("fingerprint").notNull(),
    schema: jsonb("schema").$type<JsonObject>().notNull(),
    publishedAt: timestamp("published_at", { mode: "string", withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("source_schema_versions_fingerprint_unique").on(
      table.organizationId,
      table.sourceSystemId,
      table.stream,
      table.fingerprint,
    ),
    unique("source_schema_versions_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.sourceSystemId],
      foreignColumns: [sourceSystems.organizationId, sourceSystems.id],
      name: "source_schema_versions_source_same_org_fk",
    }).onDelete("cascade"),
  ],
);

export const rawRecordEnvelopes = pgTable(
  "raw_record_envelopes",
  {
    id: uuid("id").$type<RawRecordEnvelopeId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    sourceSystemId: uuid("source_system_id").$type<SourceSystemId>().notNull(),
    captureRunId: uuid("capture_run_id").$type<CaptureRunId>().notNull(),
    captureStreamRunId: uuid("capture_stream_run_id").$type<CaptureStreamRunId>().notNull(),
    sourceSchemaVersionId: uuid("source_schema_version_id").$type<SourceSchemaVersionId>(),
    stream: text("stream").notNull(),
    nativeId: text("native_id").notNull(),
    captureMethod: captureMethodEnum("capture_method").notNull(),
    capturedAt: timestamp("captured_at", { mode: "string", withTimezone: true }).notNull(),
    sourceUpdatedAt: timestamp("source_updated_at", { mode: "string", withTimezone: true }),
    payload: jsonb("payload").$type<JsonObject>().notNull(),
    checksum: text("checksum").notNull(),
    tombstone: boolean("tombstone").default(false).notNull(),
    classification: dataClassificationEnum("classification").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("raw_records_scope_idempotency_unique").on(
      table.organizationId,
      table.captureRunId,
      table.idempotencyKey,
    ),
    unique("raw_records_org_id_unique").on(table.organizationId, table.id),
    index("raw_records_native_lookup_idx").on(
      table.organizationId,
      table.sourceSystemId,
      table.stream,
      table.nativeId,
    ),
    foreignKey({
      columns: [table.organizationId, table.sourceSystemId],
      foreignColumns: [sourceSystems.organizationId, sourceSystems.id],
      name: "raw_records_source_same_org_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.captureRunId],
      foreignColumns: [captureRuns.organizationId, captureRuns.id],
      name: "raw_records_run_same_org_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.captureStreamRunId],
      foreignColumns: [captureStreamRuns.organizationId, captureStreamRuns.id],
      name: "raw_records_stream_run_same_org_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.sourceSchemaVersionId],
      foreignColumns: [sourceSchemaVersions.organizationId, sourceSchemaVersions.id],
      name: "raw_records_schema_same_org_fk",
    }).onDelete("restrict"),
  ],
);
