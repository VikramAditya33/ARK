// SPDX-License-Identifier: MIT

import type {
  CapabilityId,
  CapabilityVersionId,
  OrganizationId,
  VerifierSpecId,
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

import { organizations } from "./identity.js";
import { createdAt, type JsonObject, updatedAt } from "./shared.js";

export const capabilities = pgTable(
  "capabilities",
  {
    id: uuid("id").$type<CapabilityId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    owner: text("owner").notNull(),
    criticality: text("criticality").notNull(),
    currentVersionId: uuid("current_version_id").$type<CapabilityVersionId>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("capabilities_org_key_unique").on(table.organizationId, table.key),
    unique("capabilities_org_id_unique").on(table.organizationId, table.id),
  ],
);

export const capabilityVersions = pgTable(
  "capability_versions",
  {
    id: uuid("id").$type<CapabilityVersionId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    capabilityId: uuid("capability_id").$type<CapabilityId>().notNull(),
    version: integer("version").notNull(),
    checksum: text("checksum").notNull(),
    specification: jsonb("specification").$type<JsonObject>().notNull(),
    publishedAt: timestamp("published_at", { mode: "string", withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("capability_versions_capability_version_unique").on(
      table.organizationId,
      table.capabilityId,
      table.version,
    ),
    unique("capability_versions_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.capabilityId],
      foreignColumns: [capabilities.organizationId, capabilities.id],
      name: "capability_versions_capability_same_org_fk",
    }).onDelete("cascade"),
  ],
);

export const verifierSpecs = pgTable(
  "verifier_specs",
  {
    id: uuid("id").$type<VerifierSpecId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    capabilityVersionId: uuid("capability_version_id").$type<CapabilityVersionId>().notNull(),
    kind: text("kind").notNull(),
    version: text("version").notNull(),
    checksum: text("checksum").notNull(),
    config: jsonb("config").$type<JsonObject>().notNull(),
    publishedAt: timestamp("published_at", { mode: "string", withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("verifier_specs_version_kind_unique").on(
      table.organizationId,
      table.capabilityVersionId,
      table.kind,
      table.version,
    ),
    unique("verifier_specs_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.capabilityVersionId],
      foreignColumns: [capabilityVersions.organizationId, capabilityVersions.id],
      name: "verifier_specs_capability_version_same_org_fk",
    }).onDelete("cascade"),
  ],
);
