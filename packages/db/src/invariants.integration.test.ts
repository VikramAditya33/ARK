// SPDX-License-Identifier: MIT

import {
  CaptureRunId,
  CaptureStreamRunId,
  ConnectorDefinitionId,
  ConnectorInstanceId,
  EntityId,
  EntityVersionId,
  EvidenceItemId,
  OrganizationId,
  ProvenanceEdgeId,
  RawRecordEnvelopeId,
  SourceSystemId,
  StateTransitionId,
} from "@ark/domain";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createDatabase } from "./database.js";
import { applyMigrations } from "./migrator.js";
import {
  captureRuns,
  captureStreamRuns,
  connectorDefinitions,
  connectorInstances,
  entities,
  entityVersions,
  evidenceItems,
  organizations,
  provenanceEdges,
  rawRecordEnvelopes,
  sourceSystems,
  stateTransitions,
} from "./schema/index.js";
import { withTemporaryDatabase } from "./testing/postgres.js";

const databaseUrl = process.env.DATABASE_URL;
const migrationDirectory = new URL("../../../infra/migrations/", import.meta.url).pathname;

describe.skipIf(!databaseUrl)("database invariants", () => {
  it("enforces tenant boundaries, idempotency, immutability, and exact provenance", async () => {
    await withTemporaryDatabase(databaseUrl!, async (temporaryDatabaseUrl) => {
      await applyMigrations(temporaryDatabaseUrl, migrationDirectory);
      const handle = createDatabase(temporaryDatabaseUrl, { max: 1 });
      const organizationId = OrganizationId.generate();
      const foreignOrganizationId = OrganizationId.generate();
      const sourceSystemId = SourceSystemId.generate();
      const connectorDefinitionId = ConnectorDefinitionId.generate();
      const connectorInstanceId = ConnectorInstanceId.generate();
      const captureRunId = CaptureRunId.generate();
      const captureStreamRunId = CaptureStreamRunId.generate();
      const rawRecordEnvelopeId = RawRecordEnvelopeId.generate();
      const entityId = EntityId.generate();
      const entityVersionId = EntityVersionId.generate();

      try {
        await handle.db.insert(organizations).values([
          { id: organizationId, slug: "invariants-primary", name: "Primary" },
          { id: foreignOrganizationId, slug: "invariants-foreign", name: "Foreign" },
        ]);
        await handle.db.insert(connectorDefinitions).values({
          id: connectorDefinitionId,
          key: "demo-crm",
          version: "1.0.0",
          displayName: "Demo CRM",
          manifest: {},
        });
        await handle.db.insert(sourceSystems).values({
          id: sourceSystemId,
          organizationId,
          key: "crm",
          displayName: "CRM",
          kind: "demo-crm",
        });

        await expect(
          handle.db.insert(connectorInstances).values({
            id: ConnectorInstanceId.generate(),
            organizationId: foreignOrganizationId,
            sourceSystemId,
            connectorDefinitionId,
            name: "cross-tenant-connector",
          }),
        ).rejects.toMatchObject({ cause: { code: "23503" } });

        await handle.db.insert(connectorInstances).values({
          id: connectorInstanceId,
          organizationId,
          sourceSystemId,
          connectorDefinitionId,
          name: "primary-connector",
        });
        await handle.db.insert(captureRuns).values({
          id: captureRunId,
          organizationId,
          connectorInstanceId,
          idempotencyKey: "capture:primary:1",
        });
        await handle.db.insert(captureStreamRuns).values({
          id: captureStreamRunId,
          organizationId,
          captureRunId,
          stream: "customers",
          idempotencyKey: "capture:primary:customers:1",
        });
        await handle.db.insert(rawRecordEnvelopes).values({
          id: rawRecordEnvelopeId,
          organizationId,
          sourceSystemId,
          captureRunId,
          captureStreamRunId,
          stream: "customers",
          nativeId: "cust_3918",
          captureMethod: "api",
          capturedAt: "2026-09-01T08:30:00.000Z",
          payload: { renewalDate: "2026-09-30" },
          checksum: "sha256:raw-customer-3918",
          classification: "confidential",
          idempotencyKey: "raw:customers:cust_3918:v1",
        });
        await handle.db.insert(entities).values({
          id: entityId,
          organizationId,
          entityType: "customer",
        });
        await handle.db.insert(entityVersions).values({
          id: entityVersionId,
          organizationId,
          entityId,
          version: 1,
          contentHash: "sha256:entity-customer-3918",
          displayName: "Acme Manufacturing",
          attributes: { renewalDate: "2026-09-30" },
          classification: "confidential",
          publishedAt: "2026-09-01T08:31:00.000Z",
        });
        await handle.db.insert(provenanceEdges).values({
          id: ProvenanceEdgeId.generate(),
          organizationId,
          targetType: "entity-version",
          targetId: entityVersionId,
          targetJsonPointer: "/attributes/renewalDate",
          sourceSystemId,
          captureRunId,
          stream: "customers",
          nativeId: "cust_3918",
          sourceJsonPointer: "/renewalDate",
          rawRecordEnvelopeId,
          captureMethod: "api",
          capturedAt: "2026-09-01T08:30:00.000Z",
        });

        const provenance = await handle.client<
          { raw_record_envelope_id: string; native_id: string }[]
        >`
          select raw.id as raw_record_envelope_id, raw.native_id
          from provenance_edges edge
          join raw_record_envelopes raw
            on raw.organization_id = edge.organization_id
           and raw.id = edge.raw_record_envelope_id
          where edge.organization_id = ${organizationId}
            and edge.target_id = ${entityVersionId}
            and edge.target_json_pointer = '/attributes/renewalDate'
        `;
        expect(provenance).toEqual([
          { raw_record_envelope_id: rawRecordEnvelopeId, native_id: "cust_3918" },
        ]);

        await expect(
          handle.db
            .update(entityVersions)
            .set({ displayName: "Tampered" })
            .where(eq(entityVersions.id, entityVersionId)),
        ).rejects.toMatchObject({ cause: { code: "55000" } });

        const evidenceItemId = EvidenceItemId.generate();
        await handle.db.insert(evidenceItems).values({
          id: evidenceItemId,
          organizationId,
          kind: "database-assertion",
          checksum: "sha256:evidence-1",
          classification: "internal",
          publishedAt: "2026-09-01T08:32:00.000Z",
        });
        await expect(
          handle.db
            .update(evidenceItems)
            .set({ metadata: { tampered: true } })
            .where(eq(evidenceItems.id, evidenceItemId)),
        ).rejects.toMatchObject({ cause: { code: "55000" } });

        const transitionAggregateId = CaptureRunId.generate();
        await handle.db.insert(stateTransitions).values({
          id: StateTransitionId.generate(),
          organizationId,
          machine: "capture",
          aggregateId: transitionAggregateId,
          fromState: "queued",
          toState: "provisioning",
          revision: 1,
          idempotencyKey: "transition:capture:start",
          correlationId: "capture-test",
        });
        await expect(
          handle.db.insert(stateTransitions).values({
            id: StateTransitionId.generate(),
            organizationId,
            machine: "capture",
            aggregateId: transitionAggregateId,
            fromState: "provisioning",
            toState: "capturing",
            revision: 2,
            idempotencyKey: "transition:capture:start",
            correlationId: "capture-test",
          }),
        ).rejects.toMatchObject({ cause: { code: "23505" } });

        const otherEntityId = EntityId.generate();
        const otherVersionId = EntityVersionId.generate();
        await handle.db.insert(entities).values({
          id: otherEntityId,
          organizationId,
          entityType: "customer",
        });
        await handle.db.insert(entityVersions).values({
          id: otherVersionId,
          organizationId,
          entityId: otherEntityId,
          version: 1,
          contentHash: "sha256:other-entity",
          displayName: "Other Customer",
          classification: "internal",
        });
        await expect(
          handle.db
            .update(entities)
            .set({ currentVersionId: otherVersionId })
            .where(eq(entities.id, entityId)),
        ).rejects.toMatchObject({ cause: { code: "23503" } });
      } finally {
        await handle.close();
      }
    });
  });
});
