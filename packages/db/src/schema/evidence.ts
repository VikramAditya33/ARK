// SPDX-License-Identifier: MIT

import type {
  DrillRunId,
  EvidenceItemId,
  EvidenceManifestId,
  OrganizationId,
  RecoveryBuildId,
} from "@ark/domain";
import {
  foreignKey,
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
import { drillRuns, recoveryBuilds } from "./recovery.js";
import { createdAt, emptyJsonObject, type JsonObject } from "./shared.js";

export const evidenceItems = pgTable(
  "evidence_items",
  {
    id: uuid("id").$type<EvidenceItemId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    drillRunId: uuid("drill_run_id").$type<DrillRunId>(),
    kind: text("kind").notNull(),
    checksum: text("checksum").notNull(),
    objectKey: text("object_key"),
    classification: dataClassificationEnum("classification").notNull(),
    metadata: jsonb("metadata").$type<JsonObject>().default(emptyJsonObject).notNull(),
    publishedAt: timestamp("published_at", { mode: "string", withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("evidence_items_org_checksum_unique").on(table.organizationId, table.checksum),
    unique("evidence_items_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.drillRunId],
      foreignColumns: [drillRuns.organizationId, drillRuns.id],
      name: "evidence_items_drill_same_org_fk",
    }).onDelete("cascade"),
  ],
);

export const evidenceManifests = pgTable(
  "evidence_manifests",
  {
    id: uuid("id").$type<EvidenceManifestId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    drillRunId: uuid("drill_run_id").$type<DrillRunId>().notNull(),
    recoveryBuildId: uuid("recovery_build_id").$type<RecoveryBuildId>().notNull(),
    checksum: text("checksum").notNull(),
    manifest: jsonb("manifest").$type<JsonObject>().notNull(),
    publishedAt: timestamp("published_at", { mode: "string", withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("evidence_manifests_drill_unique").on(table.organizationId, table.drillRunId),
    unique("evidence_manifests_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.drillRunId],
      foreignColumns: [drillRuns.organizationId, drillRuns.id],
      name: "evidence_manifests_drill_same_org_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.recoveryBuildId],
      foreignColumns: [recoveryBuilds.organizationId, recoveryBuilds.id],
      name: "evidence_manifests_build_same_org_fk",
    }).onDelete("restrict"),
  ],
);
