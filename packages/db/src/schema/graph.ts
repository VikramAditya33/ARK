// SPDX-License-Identifier: MIT

import type {
  ArtifactId,
  ArtifactVersionId,
  CaptureRunId,
  EntityId,
  EntityVersionId,
  OrganizationId,
  ProvenanceEdgeId,
  RawRecordEnvelopeId,
  RelationshipId,
  SourceSystemId,
} from "@ark/domain";
import {
  bigint,
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

import { captureMethodEnum, dataClassificationEnum } from "./enums.js";
import { organizations } from "./identity.js";
import { createdAt, emptyJsonObject, type JsonObject, updatedAt } from "./shared.js";
import { captureRuns, rawRecordEnvelopes } from "./captures.js";
import { sourceSystems } from "./sources.js";

export const entities = pgTable(
  "entities",
  {
    id: uuid("id").$type<EntityId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    currentVersionId: uuid("current_version_id").$type<EntityVersionId>(),
    status: text("status").default("active").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("entities_org_id_unique").on(table.organizationId, table.id),
    index("entities_type_idx").on(table.organizationId, table.entityType),
  ],
);

export const entityVersions = pgTable(
  "entity_versions",
  {
    id: uuid("id").$type<EntityVersionId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    entityId: uuid("entity_id").$type<EntityId>().notNull(),
    version: integer("version").notNull(),
    contentHash: text("content_hash").notNull(),
    displayName: text("display_name").notNull(),
    attributes: jsonb("attributes").$type<JsonObject>().default(emptyJsonObject).notNull(),
    classification: dataClassificationEnum("classification").notNull(),
    publishedAt: timestamp("published_at", { mode: "string", withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("entity_versions_entity_version_unique").on(
      table.organizationId,
      table.entityId,
      table.version,
    ),
    uniqueIndex("entity_versions_entity_hash_unique").on(
      table.organizationId,
      table.entityId,
      table.contentHash,
    ),
    unique("entity_versions_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.entityId],
      foreignColumns: [entities.organizationId, entities.id],
      name: "entity_versions_entity_same_org_fk",
    }).onDelete("cascade"),
  ],
);

export const relationships = pgTable(
  "relationships",
  {
    id: uuid("id").$type<RelationshipId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    fromEntityId: uuid("from_entity_id").$type<EntityId>().notNull(),
    toEntityId: uuid("to_entity_id").$type<EntityId>().notNull(),
    relationshipType: text("relationship_type").notNull(),
    attributes: jsonb("attributes").$type<JsonObject>().default(emptyJsonObject).notNull(),
    classification: dataClassificationEnum("classification").notNull(),
    validFrom: timestamp("valid_from", { mode: "string", withTimezone: true })
      .defaultNow()
      .notNull(),
    validTo: timestamp("valid_to", { mode: "string", withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    unique("relationships_org_id_unique").on(table.organizationId, table.id),
    index("relationships_from_idx").on(
      table.organizationId,
      table.fromEntityId,
      table.relationshipType,
    ),
    index("relationships_to_idx").on(
      table.organizationId,
      table.toEntityId,
      table.relationshipType,
    ),
    foreignKey({
      columns: [table.organizationId, table.fromEntityId],
      foreignColumns: [entities.organizationId, entities.id],
      name: "relationships_from_same_org_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.toEntityId],
      foreignColumns: [entities.organizationId, entities.id],
      name: "relationships_to_same_org_fk",
    }).onDelete("cascade"),
  ],
);

export const artifacts = pgTable(
  "artifacts",
  {
    id: uuid("id").$type<ArtifactId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    currentVersionId: uuid("current_version_id").$type<ArtifactVersionId>(),
    status: text("status").default("active").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [unique("artifacts_org_id_unique").on(table.organizationId, table.id)],
);

export const artifactVersions = pgTable(
  "artifact_versions",
  {
    id: uuid("id").$type<ArtifactVersionId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    artifactId: uuid("artifact_id").$type<ArtifactId>().notNull(),
    version: integer("version").notNull(),
    checksum: text("checksum").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "bigint" }).notNull(),
    mediaType: text("media_type").notNull(),
    objectKey: text("object_key").notNull(),
    classification: dataClassificationEnum("classification").notNull(),
    metadata: jsonb("metadata").$type<JsonObject>().default(emptyJsonObject).notNull(),
    publishedAt: timestamp("published_at", { mode: "string", withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("artifact_versions_artifact_version_unique").on(
      table.organizationId,
      table.artifactId,
      table.version,
    ),
    uniqueIndex("artifact_versions_org_checksum_unique").on(table.organizationId, table.checksum),
    unique("artifact_versions_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.artifactId],
      foreignColumns: [artifacts.organizationId, artifacts.id],
      name: "artifact_versions_artifact_same_org_fk",
    }).onDelete("cascade"),
  ],
);

export const provenanceEdges = pgTable(
  "provenance_edges",
  {
    id: uuid("id").$type<ProvenanceEdgeId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    targetJsonPointer: text("target_json_pointer"),
    sourceSystemId: uuid("source_system_id").$type<SourceSystemId>().notNull(),
    captureRunId: uuid("capture_run_id").$type<CaptureRunId>().notNull(),
    stream: text("stream").notNull(),
    nativeId: text("native_id").notNull(),
    sourceJsonPointer: text("source_json_pointer"),
    rawRecordEnvelopeId: uuid("raw_record_envelope_id").$type<RawRecordEnvelopeId>(),
    artifactVersionId: uuid("artifact_version_id").$type<ArtifactVersionId>(),
    captureMethod: captureMethodEnum("capture_method").notNull(),
    capturedAt: timestamp("captured_at", { mode: "string", withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    unique("provenance_edges_org_id_unique").on(table.organizationId, table.id),
    index("provenance_edges_target_idx").on(table.organizationId, table.targetType, table.targetId),
    foreignKey({
      columns: [table.organizationId, table.sourceSystemId],
      foreignColumns: [sourceSystems.organizationId, sourceSystems.id],
      name: "provenance_edges_source_same_org_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.captureRunId],
      foreignColumns: [captureRuns.organizationId, captureRuns.id],
      name: "provenance_edges_capture_same_org_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.rawRecordEnvelopeId],
      foreignColumns: [rawRecordEnvelopes.organizationId, rawRecordEnvelopes.id],
      name: "provenance_edges_raw_record_same_org_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.artifactVersionId],
      foreignColumns: [artifactVersions.organizationId, artifactVersions.id],
      name: "provenance_edges_artifact_same_org_fk",
    }).onDelete("restrict"),
  ],
);
