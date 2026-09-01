// SPDX-License-Identifier: MIT

import type {
  ApprovalId,
  IncidentId,
  IncidentMemberId,
  MembershipId,
  OrganizationId,
  ReconciliationItemId,
  RecoveryBuildId,
  RecoveryEventId,
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

import {
  approvalStateEnum,
  dataClassificationEnum,
  incidentStateEnum,
  reconciliationStateEnum,
} from "./enums.js";
import { memberships, organizations } from "./identity.js";
import { recoveryBuilds } from "./recovery.js";
import { createdAt, emptyJsonArray, type JsonObject, updatedAt } from "./shared.js";
import { sourceSystems } from "./sources.js";

export const incidents = pgTable(
  "incidents",
  {
    id: uuid("id").$type<IncidentId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    state: incidentStateEnum("state").default("declared").notNull(),
    title: text("title").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    declaredByMembershipId: uuid("declared_by_membership_id").$type<MembershipId>().notNull(),
    recoveryBuildId: uuid("recovery_build_id").$type<RecoveryBuildId>(),
    affectedSourceSystemIds: jsonb("affected_source_system_ids")
      .$type<readonly SourceSystemId[]>()
      .default(emptyJsonArray)
      .notNull(),
    declaredAt: timestamp("declared_at", { mode: "string", withTimezone: true })
      .defaultNow()
      .notNull(),
    resolvedAt: timestamp("resolved_at", { mode: "string", withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("incidents_org_idempotency_unique").on(table.organizationId, table.idempotencyKey),
    unique("incidents_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.declaredByMembershipId],
      foreignColumns: [memberships.organizationId, memberships.id],
      name: "incidents_declarer_same_org_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.recoveryBuildId],
      foreignColumns: [recoveryBuilds.organizationId, recoveryBuilds.id],
      name: "incidents_build_same_org_fk",
    }).onDelete("restrict"),
  ],
);

export const incidentMembers = pgTable(
  "incident_members",
  {
    id: uuid("id").$type<IncidentMemberId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    incidentId: uuid("incident_id").$type<IncidentId>().notNull(),
    membershipId: uuid("membership_id").$type<MembershipId>().notNull(),
    incidentRole: text("incident_role").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("incident_members_incident_membership_unique").on(
      table.organizationId,
      table.incidentId,
      table.membershipId,
    ),
    unique("incident_members_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.incidentId],
      foreignColumns: [incidents.organizationId, incidents.id],
      name: "incident_members_incident_same_org_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.membershipId],
      foreignColumns: [memberships.organizationId, memberships.id],
      name: "incident_members_membership_same_org_fk",
    }).onDelete("cascade"),
  ],
);

export const recoveryEvents = pgTable(
  "recovery_events",
  {
    id: uuid("id").$type<RecoveryEventId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    incidentId: uuid("incident_id").$type<IncidentId>().notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    actor: jsonb("actor").$type<JsonObject>().notNull(),
    source: text("source").notNull(),
    change: jsonb("change").$type<JsonObject>().notNull(),
    occurredAt: timestamp("occurred_at", { mode: "string", withTimezone: true }).notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    causationId: uuid("causation_id").$type<RecoveryEventId>(),
    correlationId: text("correlation_id").notNull(),
    classification: dataClassificationEnum("classification").notNull(),
    provenance: jsonb("provenance")
      .$type<readonly JsonObject[]>()
      .default(emptyJsonArray)
      .notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("recovery_events_incident_idempotency_unique").on(
      table.organizationId,
      table.incidentId,
      table.idempotencyKey,
    ),
    unique("recovery_events_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.incidentId],
      foreignColumns: [incidents.organizationId, incidents.id],
      name: "recovery_events_incident_same_org_fk",
    }).onDelete("cascade"),
  ],
);

export const reconciliationItems = pgTable(
  "reconciliation_items",
  {
    id: uuid("id").$type<ReconciliationItemId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    incidentId: uuid("incident_id").$type<IncidentId>().notNull(),
    sourceSystemId: uuid("source_system_id").$type<SourceSystemId>().notNull(),
    state: reconciliationStateEnum("state").default("proposed").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    proposedChange: jsonb("proposed_change").$type<JsonObject>().notNull(),
    conflict: jsonb("conflict").$type<JsonObject>(),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("reconciliation_items_incident_idempotency_unique").on(
      table.organizationId,
      table.incidentId,
      table.idempotencyKey,
    ),
    unique("reconciliation_items_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.incidentId],
      foreignColumns: [incidents.organizationId, incidents.id],
      name: "reconciliation_items_incident_same_org_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.sourceSystemId],
      foreignColumns: [sourceSystems.organizationId, sourceSystems.id],
      name: "reconciliation_items_source_same_org_fk",
    }).onDelete("restrict"),
  ],
);

export const approvals = pgTable(
  "approvals",
  {
    id: uuid("id").$type<ApprovalId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    subjectType: text("subject_type").notNull(),
    subjectId: uuid("subject_id").notNull(),
    state: approvalStateEnum("state").default("pending").notNull(),
    requestedByMembershipId: uuid("requested_by_membership_id").$type<MembershipId>().notNull(),
    decidedByMembershipId: uuid("decided_by_membership_id").$type<MembershipId>(),
    reason: text("reason"),
    idempotencyKey: text("idempotency_key").notNull(),
    requestedAt: timestamp("requested_at", { mode: "string", withTimezone: true })
      .defaultNow()
      .notNull(),
    decidedAt: timestamp("decided_at", { mode: "string", withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("approvals_subject_idempotency_unique").on(
      table.organizationId,
      table.subjectType,
      table.subjectId,
      table.idempotencyKey,
    ),
    unique("approvals_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.requestedByMembershipId],
      foreignColumns: [memberships.organizationId, memberships.id],
      name: "approvals_requester_same_org_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.decidedByMembershipId],
      foreignColumns: [memberships.organizationId, memberships.id],
      name: "approvals_decider_same_org_fk",
    }).onDelete("restrict"),
  ],
);
