// SPDX-License-Identifier: MIT

import {
  assertVerifiedTenantContext,
  type OrganizationId,
  type VerifiedTenantContext,
} from "@ark/domain";
import { and, eq } from "drizzle-orm";
import type {
  AnyPgColumn,
  AnyPgTable,
  PgInsertValue,
  PgUpdateSetSource,
} from "drizzle-orm/pg-core";

import type { ArkDatabase } from "./database.js";
import {
  approvals,
  artifactVersions,
  artifacts,
  auditEvents,
  browserProfileReferences,
  capabilities,
  capabilityVersions,
  captureCursors,
  captureRuns,
  captureStreamRuns,
  connectorInstances,
  credentialReferences,
  drillRuns,
  drillScenarios,
  drillSteps,
  entities,
  entityVersions,
  evidenceItems,
  evidenceManifests,
  incidentMembers,
  incidents,
  memberships,
  organizations,
  provenanceEdges,
  rawRecordEnvelopes,
  reconciliationItems,
  recoveryBuildInputs,
  recoveryBuilds,
  recoveryEvents,
  relationships,
  roles,
  solariResources,
  sourceSchemaVersions,
  sourceSystems,
  stateTransitions,
  verifierSpecs,
} from "./schema/index.js";

type TenantTable = AnyPgTable &
  Readonly<{
    id: AnyPgColumn;
    organizationId: AnyPgColumn;
  }>;

export type TenantInsert<Table extends TenantTable> = Omit<PgInsertValue<Table>, "organizationId">;

export type TenantUpdate<Table extends TenantTable> = Partial<
  Omit<PgInsertValue<Table>, "id" | "organizationId" | "createdAt">
>;

export class TenantScopedRepository<Table extends TenantTable> {
  readonly organizationId: OrganizationId;

  constructor(
    private readonly database: ArkDatabase,
    context: VerifiedTenantContext,
    readonly table: Table,
  ) {
    assertVerifiedTenantContext(context);
    this.organizationId = context.organizationId;
  }

  async findById(id: string): Promise<Table["$inferSelect"] | null> {
    const rows = await this.database
      .select()
      .from(this.table as AnyPgTable)
      .where(and(eq(this.table.organizationId, this.organizationId), eq(this.table.id, id)))
      .limit(1);
    return (rows[0] as Table["$inferSelect"] | undefined) ?? null;
  }

  async list(): Promise<readonly Table["$inferSelect"][]> {
    const rows = await this.database
      .select()
      .from(this.table as AnyPgTable)
      .where(eq(this.table.organizationId, this.organizationId));
    return rows as Table["$inferSelect"][];
  }

  async insert(values: TenantInsert<Table>): Promise<Table["$inferSelect"]> {
    const scopedValues = {
      ...values,
      organizationId: this.organizationId,
    } as PgInsertValue<Table>;
    const rows = await this.database.insert(this.table).values(scopedValues).returning();
    const row = rows[0] as Table["$inferSelect"] | undefined;
    if (!row) {
      throw new Error("Tenant insert did not return a row.");
    }
    return row;
  }

  async updateById(id: string, values: TenantUpdate<Table>): Promise<Table["$inferSelect"] | null> {
    const rows = await this.database
      .update(this.table)
      .set(values as PgUpdateSetSource<Table>)
      .where(and(eq(this.table.organizationId, this.organizationId), eq(this.table.id, id)))
      .returning();
    return (rows[0] as Table["$inferSelect"] | undefined) ?? null;
  }

  async deleteById(id: string): Promise<boolean> {
    const rows = await this.database
      .delete(this.table)
      .where(and(eq(this.table.organizationId, this.organizationId), eq(this.table.id, id)))
      .returning({ id: this.table.id });
    return rows.length === 1;
  }
}

export const TENANT_TABLES = Object.freeze({
  approvals,
  artifactVersions,
  artifacts,
  auditEvents,
  browserProfileReferences,
  capabilities,
  capabilityVersions,
  captureCursors,
  captureRuns,
  captureStreamRuns,
  connectorInstances,
  credentialReferences,
  drillRuns,
  drillScenarios,
  drillSteps,
  entities,
  entityVersions,
  evidenceItems,
  evidenceManifests,
  incidentMembers,
  incidents,
  memberships,
  provenanceEdges,
  rawRecordEnvelopes,
  reconciliationItems,
  recoveryBuildInputs,
  recoveryBuilds,
  recoveryEvents,
  relationships,
  roles,
  solariResources,
  sourceSchemaVersions,
  sourceSystems,
  stateTransitions,
  verifierSpecs,
});

export type TenantRepositories = {
  readonly [Name in keyof typeof TENANT_TABLES]: TenantScopedRepository<
    (typeof TENANT_TABLES)[Name]
  >;
};

export function createTenantRepositories(
  database: ArkDatabase,
  context: VerifiedTenantContext,
): TenantRepositories {
  assertVerifiedTenantContext(context);
  const repositories = Object.fromEntries(
    Object.entries(TENANT_TABLES).map(([name, table]) => [
      name,
      new TenantScopedRepository(database, context, table),
    ]),
  );
  return Object.freeze(repositories) as TenantRepositories;
}

export class TenantOrganizationRepository {
  readonly organizationId: OrganizationId;

  constructor(
    private readonly database: ArkDatabase,
    context: VerifiedTenantContext,
  ) {
    assertVerifiedTenantContext(context);
    this.organizationId = context.organizationId;
  }

  async findById(id: OrganizationId): Promise<typeof organizations.$inferSelect | null> {
    if (id !== this.organizationId) {
      return null;
    }
    const rows = await this.database
      .select()
      .from(organizations)
      .where(eq(organizations.id, this.organizationId))
      .limit(1);
    return rows[0] ?? null;
  }
}
