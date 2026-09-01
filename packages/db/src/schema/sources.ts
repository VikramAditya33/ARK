// SPDX-License-Identifier: MIT

import type {
  BrowserProfileReferenceId,
  ConnectorDefinitionId,
  ConnectorInstanceId,
  CredentialReferenceId,
  OrganizationId,
  SourceSystemId,
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

import { organizations } from "./identity.js";
import { createdAt, emptyJsonObject, type JsonObject, updatedAt } from "./shared.js";

export const sourceSystems = pgTable(
  "source_systems",
  {
    id: uuid("id").$type<SourceSystemId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    displayName: text("display_name").notNull(),
    kind: text("kind").notNull(),
    status: text("status").default("active").notNull(),
    metadata: jsonb("metadata").$type<JsonObject>().default(emptyJsonObject).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("source_systems_org_key_unique").on(table.organizationId, table.key),
    unique("source_systems_org_id_unique").on(table.organizationId, table.id),
  ],
);

export const connectorDefinitions = pgTable(
  "connector_definitions",
  {
    id: uuid("id").$type<ConnectorDefinitionId>().defaultRandom().primaryKey(),
    key: text("key").notNull(),
    version: text("version").notNull(),
    displayName: text("display_name").notNull(),
    manifest: jsonb("manifest").$type<JsonObject>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("connector_definitions_key_version_unique").on(table.key, table.version)],
);

export const credentialReferences = pgTable(
  "credential_references",
  {
    id: uuid("id").$type<CredentialReferenceId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    reference: text("reference").notNull(),
    purpose: text("purpose").notNull(),
    createdAt: createdAt(),
    revokedAt: timestamp("revoked_at", { mode: "string", withTimezone: true }),
  },
  (table) => [
    uniqueIndex("credential_references_org_ref_unique").on(
      table.organizationId,
      table.provider,
      table.reference,
    ),
    unique("credential_references_org_id_unique").on(table.organizationId, table.id),
  ],
);

export const browserProfileReferences = pgTable(
  "browser_profile_references",
  {
    id: uuid("id").$type<BrowserProfileReferenceId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    sourceSystemId: uuid("source_system_id").$type<SourceSystemId>().notNull(),
    profileReference: text("profile_reference").notNull(),
    environment: text("environment").notNull(),
    createdAt: createdAt(),
    revokedAt: timestamp("revoked_at", { mode: "string", withTimezone: true }),
  },
  (table) => [
    uniqueIndex("browser_profiles_org_ref_unique").on(table.organizationId, table.profileReference),
    unique("browser_profiles_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.sourceSystemId],
      foreignColumns: [sourceSystems.organizationId, sourceSystems.id],
      name: "browser_profiles_source_same_org_fk",
    }).onDelete("cascade"),
  ],
);

export const connectorInstances = pgTable(
  "connector_instances",
  {
    id: uuid("id").$type<ConnectorInstanceId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    sourceSystemId: uuid("source_system_id").$type<SourceSystemId>().notNull(),
    connectorDefinitionId: uuid("connector_definition_id")
      .$type<ConnectorDefinitionId>()
      .notNull()
      .references(() => connectorDefinitions.id, { onDelete: "restrict" }),
    credentialReferenceId: uuid("credential_reference_id").$type<CredentialReferenceId>(),
    browserProfileReferenceId: uuid(
      "browser_profile_reference_id",
    ).$type<BrowserProfileReferenceId>(),
    name: text("name").notNull(),
    config: jsonb("config").$type<JsonObject>().default(emptyJsonObject).notNull(),
    status: text("status").default("active").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("connector_instances_org_name_unique").on(table.organizationId, table.name),
    unique("connector_instances_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.sourceSystemId],
      foreignColumns: [sourceSystems.organizationId, sourceSystems.id],
      name: "connector_instances_source_same_org_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.credentialReferenceId],
      foreignColumns: [credentialReferences.organizationId, credentialReferences.id],
      name: "connector_instances_credential_same_org_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.browserProfileReferenceId],
      foreignColumns: [browserProfileReferences.organizationId, browserProfileReferences.id],
      name: "connector_instances_profile_same_org_fk",
    }).onDelete("restrict"),
  ],
);
